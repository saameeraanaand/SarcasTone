import json
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from .schemas.api import TextRequest, TextResult, AudioResult
from .services.ml_service import MlService
from .ml.data import load_dataframe

app = FastAPI(title="SarcasTone API", version="1.0", description="Multimodal sarcasm detection (text + speech prosody)")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"], allow_methods=["*"], allow_headers=["*"])
svc = MlService(); ALLOWED = {".wav", ".mp3", ".webm", ".ogg", ".m4a", ".flac"}; MAX_MB = 15

async def _read(file: UploadFile):
    import os
    ext = os.path.splitext(file.filename or "")[1].lower() or ".webm"
    if ext not in ALLOWED: raise HTTPException(415, f"Unsupported audio type {ext}. Allowed: {sorted(ALLOWED)}")
    raw = await file.read()
    if len(raw) > MAX_MB * 1024 * 1024: raise HTTPException(413, f"File larger than {MAX_MB} MB")
    if len(raw) < 1000: raise HTTPException(422, "Audio file is empty or truncated")
    return raw, ext

@app.get("/api/health")
def health():
    return {"status": "ok", "models_loaded": sorted(svc.models), "audio_models_trained": "speech" in svc.models and "fusion" in svc.models}

@app.post("/api/analyze/text", response_model=TextResult)
def analyze_text(req: TextRequest):
    try: return svc.text(req.text)
    except RuntimeError as e: raise HTTPException(503, str(e))

@app.post("/api/analyze/audio", response_model=AudioResult)
async def analyze_audio(file: UploadFile = File(...)):
    raw, ext = await _read(file)
    try: return svc.audio(raw, ext, mode="audio")
    except ValueError as e: raise HTTPException(422, str(e))
    except Exception as e: raise HTTPException(422, f"Could not decode audio: {e}")

@app.post("/api/analyze/multimodal", response_model=AudioResult)
async def analyze_multimodal(file: UploadFile = File(...), text: str = Form(..., min_length=2, max_length=2000)):
    raw, ext = await _read(file)
    try: return svc.audio(raw, ext, text=text, mode="multimodal")
    except ValueError as e: raise HTTPException(422, str(e))
    except Exception as e: raise HTTPException(422, f"Could not decode audio: {e}")

@app.get("/api/models/metrics")
def metrics(): return svc.metrics

@app.get("/api/dataset/overview")
def overview():
    df = load_dataframe()
    return {"source": "MUStARD (Castro et al., ACL 2019), github.com/soujanyaporia/MUStARD", "total": len(df),
            "sarcastic": int(df.label.sum()), "non_sarcastic": int((1 - df.label).sum()),
            "missing_values": int(df[["text", "speaker", "show", "label"]].isna().sum().sum()),
            "audio_available": int(df.has_audio.sum()), "n_speakers": int(df.speaker.nunique()),
            "by_show": df.groupby(["show", "label"]).size().unstack(fill_value=0).rename(columns={0: "non_sarcastic", 1: "sarcastic"}).reset_index().to_dict("records"),
            "top_speakers": df.speaker.value_counts().head(8).to_dict(),
            "avg_words": float(df.text.str.split().str.len().mean())}

@app.get("/api/dataset/samples")
def samples(q: str = "", label: str = "all", show: str = "all", limit: int = 50, offset: int = 0):
    df = load_dataframe()
    if q: df = df[df.text.str.contains(q, case=False, regex=False)]
    if label in ("sarcastic", "non_sarcastic"): df = df[df.label == (label == "sarcastic")]
    if show != "all": df = df[df["show"] == show]
    page = df.iloc[offset: offset + min(limit, 200)]
    return {"total": len(df), "items": page[["id", "text", "speaker", "show", "label", "has_audio"]].to_dict("records")}

@app.get("/api/models/exploratory")
def exploratory():
    from .ml.data import ROOT
    f = ROOT / "results" / "exploratory_text.json"
    return json.loads(f.read_text()) if f.exists() else []
