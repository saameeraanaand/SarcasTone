"""Speech prosody features (Librosa). Every number is computed from the waveform."""
import numpy as np, librosa

SR = 16000
N_MFCC = 13

def load_audio(path, sr=SR):
    y, _ = librosa.load(path, sr=sr, mono=True)
    y, _ = librosa.effects.trim(y, top_db=30)
    return y, sr

def contours(y, sr=SR):
    hop = 256
    f0, voiced, _ = librosa.pyin(y, fmin=70, fmax=400, sr=sr, hop_length=hop)
    rms = librosa.feature.rms(y=y, frame_length=512, hop_length=hop)[0]
    t = librosa.times_like(rms, sr=sr, hop_length=hop)
    f0 = np.where(voiced, f0, np.nan)
    n = min(len(f0), len(rms))
    return t[:n], f0[:n], rms[:n], hop

def pause_stats(rms, hop, sr=SR):
    thr = 0.1 * np.max(rms) if len(rms) else 0
    pauses, run = [], 0
    for s in rms < thr:
        if s: run += 1
        elif run: pauses.append(run * hop / sr); run = 0
    if run: pauses.append(run * hop / sr)
    return [p for p in pauses if p >= 0.15]

def speaking_rate(y, sr=SR):
    """Approximate syllable rate from RMS-envelope peaks (an approximation, not ASR)."""
    env = librosa.feature.rms(y=y, hop_length=160)[0]
    peaks = librosa.util.peak_pick(env, pre_max=3, post_max=3, pre_avg=5, post_avg=5,
                                   delta=0.1 * (env.max() + 1e-9), wait=5)
    dur = len(y) / sr
    return len(peaks) / dur if dur > 0 else 0.0

def feature_vector(y, sr=SR):
    dur = len(y) / sr
    t, f0, rms, hop = contours(y, sr)
    f = f0[~np.isnan(f0)]
    if len(f) < 2: f = np.array([0.0, 0.0])
    mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=N_MFCC)
    zcr = librosa.feature.zero_crossing_rate(y)[0]
    cent = librosa.feature.spectral_centroid(y=y, sr=sr)[0]
    roll = librosa.feature.spectral_rolloff(y=y, sr=sr)[0]
    bw = librosa.feature.spectral_bandwidth(y=y, sr=sr)[0]
    pauses = pause_stats(rms, hop, sr)
    feats = {
        "duration": dur, "f0_mean": f.mean(), "f0_std": f.std(), "f0_min": f.min(), "f0_max": f.max(),
        "f0_range": f.max() - f.min(), "voiced_ratio": float(np.mean(~np.isnan(f0))) if len(f0) else 0,
        "rms_mean": rms.mean(), "rms_std": rms.std(), "rms_max": rms.max(),
        "zcr_mean": zcr.mean(), "zcr_std": zcr.std(),
        "centroid_mean": cent.mean(), "centroid_std": cent.std(),
        "rolloff_mean": roll.mean(), "bandwidth_mean": bw.mean(),
        "speaking_rate": speaking_rate(y, sr),
        "n_pauses": len(pauses), "pause_total": float(sum(pauses)),
        "pause_mean": float(np.mean(pauses)) if pauses else 0.0,
        "pause_ratio": float(sum(pauses) / dur) if dur else 0.0,
    }
    for i in range(N_MFCC):
        feats[f"mfcc{i+1}_mean"] = mfcc[i].mean(); feats[f"mfcc{i+1}_std"] = mfcc[i].std()
    return {k: float(v) for k, v in feats.items()}

_probe = (np.random.RandomState(0).randn(SR).astype("float32") * 0.1)
FEATURE_NAMES = list(feature_vector(_probe).keys())
