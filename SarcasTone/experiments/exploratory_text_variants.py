"""Exploratory (NOT the official result): how text-only accuracy depends on evaluation protocol / features.
Run: cd backend && python ../experiments/exploratory_text_variants.py"""
import json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
from sklearn.model_selection import GroupKFold, StratifiedKFold, cross_val_predict
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, f1_score
from app.ml.data import load_dataframe, DATASET, clean_text, ROOT
df = load_dataframe(); y = df.label.values; g = df.speaker.values
raw = json.load(open(DATASET / "sarcasm_data.json"))
df["with_ctx"] = [clean_text(raw[i]["utterance"] + " " + " ".join(raw[i]["context"])) for i in df.id]
word = lambda: TfidfVectorizer(ngram_range=(1, 2), min_df=2, sublinear_tf=True)
char = lambda: TfidfVectorizer(analyzer="char_wb", ngram_range=(2, 5), min_df=2, sublinear_tf=True)
def run(name, col, vec, cv, grouped):
    p = Pipeline([("v", vec()), ("c", LogisticRegression(max_iter=2000))])
    pr = cross_val_predict(p, df[col], y, cv=cv, groups=g if grouped else None)
    return {"setting": name, "accuracy": accuracy_score(y, pr), "f1": f1_score(y, pr)}
sk = StratifiedKFold(5, shuffle=True, random_state=42)
out = [run("Word TF-IDF, random split (speakers leak across folds)", "clean", word, sk, False),
       run("Word TF-IDF, speaker-independent (official protocol)", "clean", word, GroupKFold(5), True),
       run("Char n-gram TF-IDF, speaker-independent", "clean", char, GroupKFold(5), True),
       run("Word TF-IDF + dialogue context, speaker-independent", "with_ctx", word, GroupKFold(5), True)]
(ROOT / "results" / "exploratory_text.json").write_text(json.dumps(out, indent=2)); print(json.dumps(out, indent=1))
