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
from .data import load_dataframe, ROOT
from .features import load_audio, feature_vector, FEATURE_NAMES

RESULTS = ROOT / "results"; MODELS = Path(__file__).resolve().parents[1] / "models"
FEAT_CSV = ROOT / "experiments" / "audio_features.csv"
SEED = 42

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
    return Pipeline([("tfidf", TfidfVectorizer(ngram_range=(1, 2), min_df=2, sublinear_tf=True)),
                     ("clf", LogisticRegression(C=1.0, max_iter=2000, random_state=SEED))])

def speech_pipe():
    return Pipeline([("sc", StandardScaler()),
                     ("clf", RandomForestClassifier(n_estimators=300, min_samples_leaf=2, random_state=SEED, n_jobs=-1))])

def fusion_pipe():
    ct = ColumnTransformer([("t", TfidfVectorizer(ngram_range=(1, 2), min_df=2, sublinear_tf=True), "clean"),
                            ("a", StandardScaler(), FEATURE_NAMES)])
    return Pipeline([("fuse", ct), ("clf", LogisticRegression(C=0.5, max_iter=3000, random_state=SEED))])

def evaluate(name, make, X, y, groups, inp):
    oof = np.zeros(len(y)); pred = np.zeros(len(y), int); t_train = 0.0; t_inf = 0.0
    for tr, te in GroupKFold(n_splits=5).split(X, y, groups):
        m = make(); t0 = time.perf_counter(); m.fit(X.iloc[tr], y[tr]); t_train += time.perf_counter() - t0
        t0 = time.perf_counter(); p = m.predict_proba(X.iloc[te])[:, 1]; t_inf += time.perf_counter() - t0
        oof[te] = p; pred[te] = (p >= 0.5).astype(int)
    pr, rc, f1, _ = precision_recall_fscore_support(y, pred, average="binary", zero_division=0)
    fpr, tpr, _ = roc_curve(y, oof)
    step = max(1, len(fpr) // 60)
    final = make().fit(X, y)
    return final, {"model": name, "input": inp, "n_samples": int(len(y)), "cv": "5-fold GroupKFold by speaker",
        "accuracy": accuracy_score(y, pred), "precision": pr, "recall": rc, "f1": f1,
        "roc_auc": roc_auc_score(y, oof), "confusion_matrix": confusion_matrix(y, pred).tolist(),
        "roc_curve": {"fpr": fpr[::step].tolist(), "tpr": tpr[::step].tolist()},
        "train_time_s_total_5folds": t_train, "inference_time_ms_per_sample": 1000 * t_inf / len(y)}

def main():
    RESULTS.mkdir(exist_ok=True); MODELS.mkdir(exist_ok=True)
    df = load_dataframe(); out = {"dataset": "MUStARD", "seed": SEED, "models": {}, "notes": []}
    y, g = df["label"].values, df["speaker"].values
    m, r = evaluate("text_only", text_pipe, df[["clean"]].squeeze(), y, g, "text")
    joblib.dump(m, MODELS / "text_model.joblib"); out["models"]["text_only"] = r
    print("text-only:", {k: round(r[k], 3) for k in ("accuracy", "precision", "recall", "f1", "roc_auc")})
    n_audio = int(df.has_audio.sum())
    if n_audio >= 0.9 * len(df):
        feats = build_audio_features(df); d2 = df[df.has_audio].reset_index(drop=True)
        A = feats.loc[d2["id"]].reset_index(drop=True); y2, g2 = d2["label"].values, d2["speaker"].values
        m, r = evaluate("speech_only", speech_pipe, A, y2, g2, "audio")
        joblib.dump(m, MODELS / "speech_model.joblib"); out["models"]["speech_only"] = r
        X = pd.concat([d2[["clean"]], A], axis=1)
        m, r = evaluate("multimodal", fusion_pipe, X, y2, g2, "text+audio")
        joblib.dump(m, MODELS / "fusion_model.joblib"); out["models"]["multimodal"] = r
        for k in ("speech_only", "multimodal"): print(k, {a: round(out["models"][k][a], 3) for a in ("accuracy", "f1", "roc_auc")})
    else:
        out["notes"].append(f"Only {n_audio}/{len(df)} audio files found in dataset/audio/. Speech-only and multimodal "
                            "models were NOT trained. Run: python scripts/setup_audio.py")
        print(out["notes"][-1])
    (RESULTS / "metrics.json").write_text(json.dumps(out, indent=2))

if __name__ == "__main__":
    main()
