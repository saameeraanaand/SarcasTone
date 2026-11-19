"""Late-fusion multimodal model: combines the (headline-augmented) text model's probability with the
prosody Random Forest's probability via a small logistic-regression meta-model.

A single joint model trained on raw TF-IDF + prosody features together is limited to MUStARD's 690
audio-labeled rows (headlines have no audio, so they can't be mixed into that joint feature space). That
meant multimodal kept the same narrow-vocabulary problem the text model had before it was augmented, even
after the text model itself got fixed. Stacking lets each side use the data and architecture suited to
it -- the text model keeps its full headline-augmented training -- while a 2-input meta-classifier learns
how much to trust each signal from the 690 rows where both exist.
"""
import numpy as np
from .data import SENT_COLS
from .features import FEATURE_NAMES

class StackedFusion:
    def __init__(self, text_model, speech_model, meta):
        self.text_model = text_model; self.speech_model = speech_model; self.meta = meta

    def predict_proba(self, X):
        pt = self.text_model.predict_proba(X[["clean"] + SENT_COLS])[:, 1]
        ps = self.speech_model.predict_proba(X[FEATURE_NAMES])[:, 1]
        return self.meta.predict_proba(np.column_stack([pt, ps]))
