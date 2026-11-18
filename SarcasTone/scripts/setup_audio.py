"""One command: download MUStARD raw clips -> extract utterance audio -> train/evaluate all 3 models.
  python scripts/setup_audio.py                      # downloads the zip (~1 GB+) from Hugging Face
  python scripts/setup_audio.py path/to/mmsd_raw_data.zip   # use a zip you already have
  python scripts/setup_audio.py --no-train           # only extract audio
Requires ffmpeg on PATH."""
import json, shutil, subprocess, sys, urllib.request, zipfile
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]; DATA = ROOT / "dataset"
URL = "https://huggingface.co/datasets/MichiganNLP/MUStARD/resolve/main/mmsd_raw_data.zip"

def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]; train = "--no-train" not in sys.argv
    if not shutil.which("ffmpeg"): sys.exit("ffmpeg not found. Install it first (Windows: winget install ffmpeg | macOS: brew install ffmpeg | Linux: sudo apt install ffmpeg).")
    z = Path(args[0]) if args else DATA / "mmsd_raw_data.zip"
    if not z.exists():
        print(f"Downloading {URL}\n(large file, this can take a while)"); urllib.request.urlretrieve(URL, z)
    raw = DATA / "raw_clips"; print("Unzipping…"); zipfile.ZipFile(z).extractall(raw)
    ids = set(json.load(open(DATA / "sarcasm_data.json")))
    out = DATA / "audio"; out.mkdir(exist_ok=True); n = 0; skipped = 0
    for mp4 in sorted(raw.rglob("*.mp4")):
        if mp4.stem not in ids: skipped += 1; continue          # skips context clips (<id>_c) and unknown files
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(mp4), "-vn", "-ac", "1", "-ar", "16000", str(out / f"{mp4.stem}.wav")], check=True); n += 1
    print(f"Extracted {n}/{len(ids)} utterance audio files ({skipped} other clips skipped).")
    if n < len(ids) * 0.9: sys.exit("Fewer than 90% of utterances have audio: check the zip contents. Models were not trained.")
    if train:
        print("Training and evaluating models (feature extraction takes a few minutes)…")
        subprocess.run([sys.executable, "-m", "app.ml.train"], cwd=ROOT / "backend", check=True)
        print("Done. Restart the backend so it loads the new models.")
if __name__ == "__main__": main()
