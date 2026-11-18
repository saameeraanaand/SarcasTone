"""MUStARD loading. Labels/transcripts come from sarcasm_data.json; audio from dataset/audio/<id>.wav."""
import json, re
from pathlib import Path
import pandas as pd

ROOT = Path(__file__).resolve().parents[3]
DATASET = ROOT / "dataset"
AUDIO_DIR = DATASET / "audio"

def clean_text(t: str) -> str:
    t = t.lower()
    t = re.sub(r"[^a-z0-9'!?., ]+", " ", t)
    return re.sub(r"\s+", " ", t).strip()

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
    return df
