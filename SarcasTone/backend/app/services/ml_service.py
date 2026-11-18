import time, subprocess, tempfile, os, shutil
from pathlib import Path
import numpy as np, pandas as pd, joblib, librosa
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
from ..ml.data import clean_text, ROOT
from ..ml.features import load_audio, feature_vector, contours, pause_stats, SR, N_MFCC, FEATURE_NAMES
import json

MODELS = Path(__file__).resolve().parents[1] / "models"
LABELS = ["Non-Sarcastic", "Sarcastic"]
_vader = SentimentIntensityAnalyzer()

class MlService:
    def __init__(self):
        self.models = {n: joblib.load(MODELS / f"{n}_model.joblib") for n in ("text", "speech", "fusion")
                       if (MODELS / f"{n}_model.joblib").exists()}
        mf = ROOT / "results" / "metrics.json"
        self.metrics = json.loads(mf.read_text()) if mf.exists() else {"models": {}, "notes": ["Run training first."]}

    def cv_acc(self, key):
        return self.metrics.get("models", {}).get(key, {}).get("accuracy")

    @staticmethod
    def _pred(p):
        i = int(p[1] >= 0.5)
        return {"label": LABELS[i], "confidence": float(max(p)), "probabilities": {LABELS[0]: float(p[0]), LABELS[1]: float(p[1])}}

    @staticmethod
    def sentiment(text):
        s = _vader.polarity_scores(text); c = s["compound"]
        return {"compound": c, "label": "positive" if c >= .05 else "negative" if c <= -.05 else "neutral",
                "pos": s["pos"], "neu": s["neu"], "neg": s["neg"]}

    def _top_terms(self, text, k=6):
        pipe = self.models["text"]; vec, clf = pipe.named_steps["tfidf"], pipe.named_steps["clf"]
        x = vec.transform([clean_text(text)]); names = vec.get_feature_names_out()
        idx = x.nonzero()[1]; contrib = [(names[i], float(x[0, i] * clf.coef_[0][i])) for i in idx]
        return sorted(contrib, key=lambda t: -abs(t[1]))[:k]

    def text(self, text):
        t0 = time.perf_counter()
        if "text" not in self.models: raise RuntimeError("Text model not trained.")
        p = self.models["text"].predict_proba([clean_text(text)])[0]
        terms = self._top_terms(text)
        expl = ("Prediction comes from a TF-IDF + Logistic Regression model. "
                + (f"Terms in your text that moved the score most (positive = toward Sarcastic): "
                   + ", ".join(f'"{t}" ({w:+.2f})' for t, w in terms) + "." if terms else
                   "None of the words in your text were in the model vocabulary, so the prediction is the model's prior.")
                + " Caveat: under speaker-independent evaluation this model performs near chance, so treat it as weak evidence.")
        return {"model": "TF-IDF + Logistic Regression", "prediction": self._pred(p), "sentiment": self.sentiment(text),
                "top_terms": [{"term": a, "weight": b} for a, b in terms], "explanation": expl,
                "model_cv_accuracy": self.cv_acc("text_only"), "processing_ms": 1000 * (time.perf_counter() - t0)}

    @staticmethod
    def _to_wav(path):
        if shutil.which("ffmpeg"):
            out = path + ".wav"
            r = subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", path, "-ac", "1", "-ar", str(SR), out])
            if r.returncode == 0: return out
        return path

    def analyze_audio(self, raw: bytes, suffix: str):
        fd, path = tempfile.mkstemp(suffix=suffix); os.write(fd, raw); os.close(fd)
        try:
            wav = self._to_wav(path)
            y, sr = load_audio(wav)
        finally:
            for f in (path, path + ".wav"):
                if os.path.exists(f): os.remove(f)
        if len(y) < sr * 0.3: raise ValueError("Audio too short after trimming silence (need >= 0.3 s of speech).")
        t, f0, rms, hop = contours(y, sr); fv = feature_vector(y, sr)
        mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=N_MFCC)
        wf = np.abs(y[: len(y) // 400 * 400]).reshape(-1, len(y) // 400 if len(y) >= 400 else 1).max(axis=1) if len(y) >= 400 else np.abs(y)
        pauses, run, start = [], 0, 0; thr = 0.1 * rms.max()
        for i, s in enumerate(rms < thr):
            if s:
                if run == 0: start = i
                run += 1
            else:
                if run * hop / sr >= 0.15: pauses.append({"start": start * hop / sr, "duration": run * hop / sr})
                run = 0
        if run * hop / sr >= 0.15: pauses.append({"start": start * hop / sr, "duration": run * hop / sr})
        stp = max(1, len(t) // 300)
        analysis = {"duration_s": len(y) / sr, "waveform": wf.astype(float).tolist(),
            "pitch_t": t[::stp].tolist(), "pitch_hz": [None if np.isnan(v) else float(v) for v in f0[::stp]],
            "energy_t": t[::stp].tolist(), "energy": rms[::stp].astype(float).tolist(),
            "mfcc": mfcc[:, ::max(1, mfcc.shape[1] // 150)].astype(float).tolist(), "pauses": pauses,
            "speaking_rate_syll_per_s": fv["speaking_rate"], "pitch_mean_hz": fv["f0_mean"], "pitch_std_hz": fv["f0_std"],
            "pitch_range_hz": fv["f0_range"], "rms_mean": fv["rms_mean"], "pause_ratio": fv["pause_ratio"],
            "n_pauses": len(pauses), "voiced_ratio": fv["voiced_ratio"]}
        return analysis, fv

    def audio(self, raw, suffix, text=None, mode="audio"):
        t0 = time.perf_counter(); analysis, fv = self.analyze_audio(raw, suffix)
        res = {"mode": mode, "analysis": analysis, "model_available": False, "model": None, "prediction": None}
        key, mkey = ("fusion", "multimodal") if mode == "multimodal" else ("speech", "speech_only")
        if mode == "multimodal":
            res["text_source"] = "user-provided"; res["sentiment"] = self.sentiment(text)
        if key in self.models:
            if mode == "multimodal":
                X = pd.DataFrame([{"clean": clean_text(text), **fv}]); res["model"] = "Feature-level fusion (TF-IDF + prosody) + Logistic Regression"
            else:
                X = pd.DataFrame([fv])[FEATURE_NAMES]; res["model"] = "Prosody features + Random Forest"
            res["prediction"] = self._pred(self.models[key].predict_proba(X)[0]); res["model_available"] = True
            res["model_cv_accuracy"] = self.cv_acc(mkey)
            res["explanation"] = "Prediction from the trained model on measured prosody features (pitch, energy, MFCC, spectral, pauses, rate)."
        else:
            res["explanation"] = ("The acoustic measurements shown are computed from your audio. No sarcasm prediction is shown because the "
                                  f"{mode} model has not been trained yet: the MUStARD audio clips were not available at training time. "
                                  "To enable it, run: python scripts/setup_audio.py (see README).")
        res["processing_ms"] = 1000 * (time.perf_counter() - t0); return res
