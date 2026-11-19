"""Train + evaluate the 3 models with speaker-independent 5-fold GroupKFold CV.
Writes results/metrics.json and persists models to backend/app/models/. Nothing is hardcoded."""
import json, time, sys
import numpy as np, pandas as pd, joblib
from pathlib import Path
from sklearn.base import clone
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (accuracy_score, precision_recall_fscore_support, confusion_matrix,
                             roc_curve, roc_auc_score)
from sklearn.model_selection import GroupKFold
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC
from .data import load_dataframe, clean_text, sentiment_shift, SENT_COLS, ROOT
from .features import load_audio, feature_vector, FEATURE_NAMES
from .fusion import StackedFusion

RESULTS = ROOT / "results"; MODELS = Path(__file__).resolve().parents[1] / "models"
FEAT_CSV = ROOT / "experiments" / "audio_features.csv"
EXTERNAL_HEADLINES = ROOT / "dataset" / "external" / "sarcasm_headlines.json"
SEED = 42

def load_external_text():
    """Generic-English sarcasm examples (News Headlines Sarcasm Dataset, Misra & Arora, CC0) used only
    to widen the text model's vocabulary beyond MUStARD's 4 sitcoms. Never used for evaluation."""
    if not EXTERNAL_HEADLINES.exists(): return None, None
    rows = [json.loads(line) for line in open(EXTERNAL_HEADLINES) if line.strip()]
    clean = [clean_text(r["headline"]) for r in rows]
    X = pd.DataFrame({"clean": clean}).join(pd.DataFrame([sentiment_shift(c) for c in clean]))
    labels = np.array([int(r["is_sarcastic"]) for r in rows])
    return X, labels

def _one(i, path):
    y, sr = load_audio(path); return i, feature_vector(y, sr)

def build_audio_features(df):
    from joblib import Parallel, delayed
    cache = pd.read_csv(FEAT_CSV).set_index("id") if FEAT_CSV.exists() else pd.DataFrame()
    todo = df[df.has_audio & ~df["id"].isin(cache.index)]
    print(f"  extracting prosody features for {len(todo)} clips ({len(cache)} cached)…", flush=True)
    new = Parallel(n_jobs=-1)(delayed(_one)(r["id"], r["audio_path"]) for _, r in todo.iterrows())
    feats = pd.concat([cache.reset_index() if len(cache) else None, pd.DataFrame([{"id": i, **f} for i, f in new])], ignore_index=True) if new or len(cache) else pd.DataFrame()
    feats.to_csv(FEAT_CSV, index=False)
    return feats.set_index("id")

def text_pipe():
    # Tried stop_words="english" to stop filler words from dominating (e.g. "an" at -1.01 on one probe
    # sentence). Measured on a 4.3k-example held-out generic-English set it was WORSE (80.8% vs 84.3%
    # accuracy, 0.89 vs 0.924 ROC-AUC) -- reverted. Don't re-add it without checking
    # external_holdout_eval() first; an 8-sentence manual probe is too small to trust for this call.
    ct = ColumnTransformer([("t", TfidfVectorizer(ngram_range=(1, 2), min_df=2, sublinear_tf=True), "clean"),
                            ("s", StandardScaler(), SENT_COLS)])
    return Pipeline([("fuse", ct), ("clf", LogisticRegression(C=1.0, max_iter=2000, random_state=SEED))])

def speech_pipe():
    return Pipeline([("sc", StandardScaler()),
                     ("clf", RandomForestClassifier(n_estimators=300, min_samples_leaf=2, random_state=SEED, n_jobs=-1))])

def evaluate(name, make, X, y, groups, inp, extra_X=None, extra_y=None):
    oof = np.zeros(len(y)); pred = np.zeros(len(y), int); t_train = 0.0; t_inf = 0.0
    for tr, te in GroupKFold(n_splits=5).split(X, y, groups):
        Xtr, ytr = X.iloc[tr], y[tr]
        if extra_X is not None:  # extra rows strengthen training only; the held-out fold `te` stays pure MUStARD
            Xtr = pd.concat([Xtr, extra_X], ignore_index=True); ytr = np.concatenate([ytr, extra_y])
        m = make(); t0 = time.perf_counter(); m.fit(Xtr, ytr); t_train += time.perf_counter() - t0
        t0 = time.perf_counter(); p = m.predict_proba(X.iloc[te])[:, 1]; t_inf += time.perf_counter() - t0
        oof[te] = p; pred[te] = (p >= 0.5).astype(int)
    pr, rc, f1, _ = precision_recall_fscore_support(y, pred, average="binary", zero_division=0)
    fpr, tpr, _ = roc_curve(y, oof)
    step = max(1, len(fpr) // 60)
    if extra_X is None:
        Xf, yf, cv_note = X, y, "5-fold GroupKFold by speaker"
    else:
        Xf = pd.concat([X, extra_X], ignore_index=True); yf = np.concatenate([y, extra_y])
        cv_note = f"5-fold GroupKFold by speaker (held-out fold is MUStARD-only; +{len(extra_y)} external headline examples added to each fold's training data, never to evaluation)"
    final = make().fit(Xf, yf)
    return final, {"model": name, "input": inp, "n_samples": int(len(y)), "cv": cv_note,
        "accuracy": accuracy_score(y, pred), "precision": pr, "recall": rc, "f1": f1,
        "roc_auc": roc_auc_score(y, oof), "confusion_matrix": confusion_matrix(y, pred).tolist(),
        "roc_curve": {"fpr": fpr[::step].tolist(), "tpr": tpr[::step].tolist()},
        "train_time_s_total_5folds": t_train, "inference_time_ms_per_sample": 1000 * t_inf / len(y)}

def external_holdout_eval(make, ext_X, ext_y, muse_X, muse_y, holdout_frac=0.15, seed=SEED):
    """Large-N sanity check on genuinely held-out generic-English headlines (not MUStARD, never used in
    training this specific model instance). MUStARD's own speaker-independent metric doesn't tell us
    whether the deployed text model works on ordinary sentences real users type, and an 8-sentence manual
    probe is too small to trust when comparing pipeline variants — this gives a ~thousands-of-examples
    number instead."""
    rng = np.random.RandomState(seed); idx = rng.permutation(len(ext_y))
    n_hold = int(len(ext_y) * holdout_frac); hold, tr = idx[:n_hold], idx[n_hold:]
    Xtr = pd.concat([muse_X, ext_X.iloc[tr]], ignore_index=True); ytr = np.concatenate([muse_y, ext_y[tr]])
    m = make().fit(Xtr, ytr)
    p = m.predict_proba(ext_X.iloc[hold])[:, 1]; pred = (p >= 0.5).astype(int)
    pr, rc, f1, _ = precision_recall_fscore_support(ext_y[hold], pred, average="binary", zero_division=0)
    return {"n_holdout": int(n_hold), "accuracy": accuracy_score(ext_y[hold], pred), "precision": pr,
            "recall": rc, "f1": f1, "roc_auc": roc_auc_score(ext_y[hold], p),
            "note": "Accuracy on held-out generic English headlines never seen by this evaluation model "
                    "(the deployed text model is trained on ALL headlines, so this is a lower bound)."}

def evaluate_fusion(text_make, speech_make, text_X, speech_X, y, g, ext_X, ext_y, seed=SEED):
    """Late fusion: a meta-classifier learns how to combine the text model's and the speech model's
    probabilities, instead of one joint model fit on raw concatenated features (which would be stuck at
    690 rows since headlines have no audio). See fusion.py for why."""
    oof = np.zeros(len(y)); pred = np.zeros(len(y), int); t_train = 0.0; t_inf = 0.0
    for tr, te in GroupKFold(n_splits=5).split(text_X, y, g):
        t0 = time.perf_counter()
        if ext_X is not None:
            tX = pd.concat([text_X.iloc[tr], ext_X], ignore_index=True); ty = np.concatenate([y[tr], ext_y])
        else:
            tX, ty = text_X.iloc[tr], y[tr]
        tm = text_make().fit(tX, ty); sm = speech_make().fit(speech_X.iloc[tr], y[tr])
        pt_tr = tm.predict_proba(text_X.iloc[tr])[:, 1]; ps_tr = sm.predict_proba(speech_X.iloc[tr])[:, 1]
        meta = LogisticRegression(max_iter=1000, random_state=seed)
        meta.fit(np.column_stack([pt_tr, ps_tr]), y[tr]); t_train += time.perf_counter() - t0
        t0 = time.perf_counter()
        pt_te = tm.predict_proba(text_X.iloc[te])[:, 1]; ps_te = sm.predict_proba(speech_X.iloc[te])[:, 1]
        p = meta.predict_proba(np.column_stack([pt_te, ps_te]))[:, 1]; t_inf += time.perf_counter() - t0
        oof[te] = p; pred[te] = (p >= 0.5).astype(int)
    pr, rc, f1, _ = precision_recall_fscore_support(y, pred, average="binary", zero_division=0)
    fpr, tpr, _ = roc_curve(y, oof); step = max(1, len(fpr) // 60)
    if ext_X is not None:
        fXf = pd.concat([text_X, ext_X], ignore_index=True); fyf = np.concatenate([y, ext_y])
    else:
        fXf, fyf = text_X, y
    final_text = text_make().fit(fXf, fyf); final_speech = speech_make().fit(speech_X, y)
    pt_full = final_text.predict_proba(text_X)[:, 1]; ps_full = final_speech.predict_proba(speech_X)[:, 1]
    final_meta = LogisticRegression(max_iter=1000, random_state=seed).fit(np.column_stack([pt_full, ps_full]), y)
    final = StackedFusion(final_text, final_speech, final_meta)
    return final, {"model": "multimodal", "input": "text+audio", "n_samples": int(len(y)),
        "cv": "5-fold GroupKFold by speaker (late fusion: text side reuses the headline-augmented text "
              "model, prosody side its own Random Forest, combined by a 2-input logistic-regression meta-model)",
        "accuracy": accuracy_score(y, pred), "precision": pr, "recall": rc, "f1": f1,
        "roc_auc": roc_auc_score(y, oof), "confusion_matrix": confusion_matrix(y, pred).tolist(),
        "roc_curve": {"fpr": fpr[::step].tolist(), "tpr": tpr[::step].tolist()},
        "train_time_s_total_5folds": t_train, "inference_time_ms_per_sample": 1000 * t_inf / len(y)}

def main():
    RESULTS.mkdir(exist_ok=True); MODELS.mkdir(exist_ok=True)
    df = load_dataframe(); out = {"dataset": "MUStARD", "seed": SEED, "models": {}, "notes": []}
    y, g = df["label"].values, df["speaker"].values
    ext_X, ext_y = load_external_text()
    m, r = evaluate("text_only", text_pipe, df[["clean"] + SENT_COLS], y, g, "text", extra_X=ext_X, extra_y=ext_y)
    joblib.dump(m, MODELS / "text_model.joblib"); out["models"]["text_only"] = r
    if ext_X is not None:
        out["models"]["text_only_generic_english_holdout"] = external_holdout_eval(
            text_pipe, ext_X, ext_y, df[["clean"] + SENT_COLS], y)
        out["notes"].append(f"text_only model additionally trained on {len(ext_y)} generic English headlines "
            "(News Headlines Sarcasm Dataset, Misra & Arora, CC0) for broader vocabulary beyond MUStARD's 4 "
            "sitcoms. Held-out evaluation above remains MUStARD-only (speaker-independent) and is unaffected. "
            "See text_only_generic_english_holdout for a large-N accuracy check on unseen generic English.")
    print("text-only:", {k: round(r[k], 3) for k in ("accuracy", "precision", "recall", "f1", "roc_auc")})
    if ext_X is not None:
        print("text-only generic-English holdout:", {k: round(out["models"]["text_only_generic_english_holdout"][k], 3)
              for k in ("accuracy", "precision", "recall", "f1", "roc_auc")})
    n_audio = int(df.has_audio.sum())
    if n_audio >= 0.9 * len(df):
        feats = build_audio_features(df); d2 = df[df.has_audio].reset_index(drop=True)
        A = feats.loc[d2["id"]].reset_index(drop=True); y2, g2 = d2["label"].values, d2["speaker"].values
        m, r = evaluate("speech_only", speech_pipe, A, y2, g2, "audio")
        joblib.dump(m, MODELS / "speech_model.joblib"); out["models"]["speech_only"] = r
        text_X2 = d2[["clean"] + SENT_COLS]
        m, r = evaluate_fusion(text_pipe, speech_pipe, text_X2, A, y2, g2, ext_X, ext_y)
        joblib.dump(m, MODELS / "fusion_model.joblib"); out["models"]["multimodal"] = r
        for k in ("speech_only", "multimodal"): print(k, {a: round(out["models"][k][a], 3) for a in ("accuracy", "f1", "roc_auc")})
    else:
        out["notes"].append(f"Only {n_audio}/{len(df)} audio files found in dataset/audio/. Speech-only and multimodal "
                            "models were NOT trained. Run: python scripts/setup_audio.py")
        print(out["notes"][-1])
    (RESULTS / "metrics.json").write_text(json.dumps(out, indent=2))

if __name__ == "__main__":
    main()
