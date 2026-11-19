"""MUStARD loading. Labels/transcripts come from sarcasm_data.json; audio from dataset/audio/<id>.wav."""
import json, re
from pathlib import Path
import pandas as pd
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

ROOT = Path(__file__).resolve().parents[3]
DATASET = ROOT / "dataset"
AUDIO_DIR = DATASET / "audio"
_vader = SentimentIntensityAnalyzer()
SENT_COLS = ["sent_shift", "sent_min", "sent_max"]
_SPLIT = re.compile(r",|;| but | yet | except | although | though | however ", re.IGNORECASE)

def clean_text(t: str) -> str:
    t = t.lower()
    t = re.sub(r"[^a-z0-9'!?., ]+", " ", t)
    return re.sub(r"\s+", " ", t).strip()

def sentiment_shift(clean: str) -> dict:
    """A bag-of-words model (TF-IDF) scores words independently, so it can't see a sentence's single
    strongest sarcasm cue: a positive clause followed by a negative one ("wonderful day, already had an
    accident"). This measures that contrast directly as an explicit feature, instead of hoping individual
    word weights happen to capture it."""
    parts = _SPLIT.split(clean, maxsplit=1)
    if len(parts) < 2:
        words = clean.split(); mid = max(1, len(words) // 2)
        parts = [" ".join(words[:mid]), " ".join(words[mid:])] if len(words) > 1 else [clean, clean]
    c1 = _vader.polarity_scores(parts[0])["compound"]; c2 = _vader.polarity_scores(parts[1])["compound"]
    return {"sent_shift": abs(c1 - c2), "sent_min": min(c1, c2), "sent_max": max(c1, c2)}

def load_dataframe() -> pd.DataFrame:
    raw = json.load(open(DATASET / "sarcasm_data.json"))
    rows = []
    for k, v in raw.items():
        wav = AUDIO_DIR / f"{k}.wav"
        rows.append(dict(id=k, text=v["utterance"], speaker=v["speaker"], show=v["show"],
                         label=int(v["sarcasm"]), n_context=len(v["context"]),
                         audio_path=str(wav) if wav.exists() else None))
    df = pd.DataFrame(rows)
    df["clean"] = df["text"].map(clean_text)
    df["has_audio"] = df["audio_path"].notna()
    df = pd.concat([df, pd.DataFrame(df["clean"].map(sentiment_shift).tolist())], axis=1)
    return df
