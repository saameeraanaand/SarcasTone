from typing import Optional
from pydantic import BaseModel, Field

class TextRequest(BaseModel):
    text: str = Field(min_length=2, max_length=2000)

class Prediction(BaseModel):
    label: str
    confidence: float
    probabilities: dict[str, float]

class Contribution(BaseModel):
    term: str
    weight: float

class Sentiment(BaseModel):
    compound: float
    label: str
    pos: float; neu: float; neg: float
    method: str = "VADER lexicon"

class TextResult(BaseModel):
    mode: str = "text"
    model: str
    prediction: Prediction
    sentiment: Sentiment
    top_terms: list[Contribution]
    explanation: str
    model_cv_accuracy: Optional[float]
    processing_ms: float

class AudioAnalysis(BaseModel):
    duration_s: float
    waveform: list[float]
    pitch_t: list[float]; pitch_hz: list[Optional[float]]
    energy_t: list[float]; energy: list[float]
    mfcc: list[list[float]]
    pauses: list[dict[str, float]]
    speaking_rate_syll_per_s: float
    pitch_mean_hz: float; pitch_std_hz: float; pitch_range_hz: float
    rms_mean: float; pause_ratio: float; n_pauses: int
    voiced_ratio: float

class DomainShift(BaseModel):
    out_of_distribution: bool
    mean_z_score: float
    note: str

class AudioResult(BaseModel):
    mode: str
    model: Optional[str]
    prediction: Optional[Prediction]
    sentiment: Optional[Sentiment] = None
    text_source: Optional[str] = None
    top_terms: list[Contribution] = []
    analysis: AudioAnalysis
    explanation: str
    model_available: bool
    model_cv_accuracy: Optional[float] = None
    domain_shift: Optional[DomainShift] = None
    processing_ms: float
