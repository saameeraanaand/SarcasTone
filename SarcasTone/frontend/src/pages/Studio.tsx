import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FileAudio, Mic, Sparkles, Square, Trash2, Type, UploadCloud, Layers, ArrowRight } from "lucide-react";
import { api, AudioResult, TextResult } from "../services/api";
import { useRecorder } from "../hooks/useRecorder";
import { useToast } from "../components/Toast";
import { useAnalysis } from "../components/AnalysisContext";
import Waveform from "../components/Waveform";
import Results from "../components/Results";
import { ErrorState, Notice, PageHeader, Spinner, EmptyState } from "../components/ui";

type Mode = "text" | "audio" | "multimodal";
const MODES: { id: Mode; label: string; icon: typeof Type; blurb: string }[] = [
  { id: "text", label: "Text", icon: Type, blurb: "What was said" }, { id: "audio", label: "Speech", icon: Mic, blurb: "How it was said" },
  { id: "multimodal", label: "Multimodal", icon: Layers, blurb: "Both, fused" }];
const EXAMPLES = ["Wonderful, another meeting!", "Oh great, it's raining on my day off.", "I really enjoyed the concert last night.", "Thanks so much for the help, that was truly useful."];

export default function Studio() {
  const [mode, setMode] = useState<Mode>("text"); const [text, setText] = useState(""); const [audio, setAudio] = useState<Blob | null>(null); const [name, setName] = useState("recording.webm");
  const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null); const [res, setRes] = useState<TextResult | AudioResult | null>(null);
  const [drag, setDrag] = useState(false); const fileRef = useRef<HTMLInputElement>(null);
  const rec = useRecorder(); const toast = useToast(); const shared = useAnalysis();
  const needsText = mode !== "audio"; const needsAudio = mode !== "text";
  const ready = (!needsText || text.trim().length >= 2) && (!needsAudio || !!audio);

  const pick = (f: File | undefined) => {
    if (!f) return; if (!/\.(wav|mp3|webm|ogg|m4a|flac)$/i.test(f.name)) { toast("error", "Please choose a WAV or MP3 file."); return; }
    if (f.size > 15 * 1024 * 1024) { toast("error", "File is larger than 15 MB."); return; } setAudio(f); setName(f.name); setRes(null);
  };
  useEffect(() => { if (rec.blob) { setAudio(rec.blob); setName("recording.webm"); setRes(null); } }, [rec.blob]);

  const run = async () => {
    setBusy(true); setErr(null); setRes(null);
    try {
      if (mode === "text") { const r = await api.text(text); setRes(r); }
      else { const r = mode === "audio" ? await api.audio(audio!, name) : await api.multimodal(audio!, name, text); setRes(r); shared.set(audio, name, r); }
      toast("success", "Analysis complete");
    } catch (e) { setErr((e as Error).message); toast("error", (e as Error).message); } finally { setBusy(false); }
  };

  return (<div className="mx-auto max-w-7xl px-4 py-10 md:px-6">
    <PageHeader title="AI Analysis Studio" sub="Analyze what is said, how it is said, or both. Every number below is computed by the backend from your input." />
    <div className="grid gap-6 lg:grid-cols-[1.05fr_1fr]">
      <div className="space-y-5">
        <div className="card grid grid-cols-3 gap-1 p-1.5">{MODES.map((m) => (
          <button key={m.id} onClick={() => { setMode(m.id); setErr(null); setRes(null); }} className={`relative rounded-xl px-3 py-3 text-left transition ${mode === m.id ? "" : "hover:bg-ink/5"}`}>
            {mode === m.id && <motion.span layoutId="mode" className="absolute inset-0 rounded-xl bg-gradient-to-br from-violet-600/30 to-cyan-500/20 ring-1 ring-violet-400/40" />}
            <span className="relative flex items-center gap-2 text-sm font-semibold"><m.icon size={16} />{m.label}</span><span className="relative text-xs text-mute">{m.blurb}</span></button>))}</div>

        {needsText && <div className="card p-5"><div className="mb-2 flex items-center justify-between"><span className="label">{mode === "multimodal" ? "Transcript (typed by you)" : "Text"}</span><span className={`font-mono text-xs ${text.length > 1900 ? "text-rose-400" : "text-mute"}`}>{text.length}/2000</span></div>
          <textarea value={text} maxLength={2000} onChange={(e) => setText(e.target.value)} rows={5} placeholder="Type or paste a sentence…" aria-label="Text to analyze"
            className="w-full resize-none rounded-xl border border-line bg-bg/50 p-4 text-base outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-400/30" />
          <div className="mt-3 flex flex-wrap gap-2">{EXAMPLES.map((e) => <button key={e} onClick={() => setText(e)} className="rounded-full border border-line px-3 py-1 text-xs text-mute transition hover:border-violet-400 hover:text-ink">{e}</button>)}</div>
          {mode === "multimodal" && <p className="mt-3 text-xs text-mute">Automatic transcription is not built in (it would need a speech-recognition model download). Type what was said in the clip; it is labelled “user-provided” in the results.</p>}</div>}

        {needsAudio && <div className="card p-5"><div className="label mb-3">Audio</div>
          {!audio ? (<div className="space-y-3">
            <div onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files[0]); }}
              onClick={() => fileRef.current?.click()} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && fileRef.current?.click()}
              className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition ${drag ? "border-cyan-400 bg-cyan-400/5" : "border-line hover:border-violet-400"}`}>
              <UploadCloud className="text-violet-400" /><div className="text-sm font-medium">Drop a WAV / MP3 here or click to browse</div><div className="text-xs text-mute">max 15 MB · speech only, ≥ 0.3 s</div>
              <input ref={fileRef} type="file" hidden accept=".wav,.mp3,.webm,.ogg,.m4a,.flac,audio/*" onChange={(e) => pick(e.target.files?.[0])} /></div>
            <div className="flex items-center gap-3 text-xs text-mute"><span className="h-px flex-1 bg-line" />or<span className="h-px flex-1 bg-line" /></div>
            {rec.recording ? (<div className="flex items-center gap-4 rounded-xl border border-rose-500/30 bg-rose-500/5 p-4"><div className="flex h-10 items-end gap-0.5">{[...Array(14)].map((_, i) => <motion.span key={i} className="w-1 rounded bg-rose-400" animate={{ height: 4 + rec.level * 36 * (0.4 + 0.6 * Math.abs(Math.sin(i * 1.3 + rec.seconds))) }} transition={{ duration: .1 }} />)}</div>
              <span className="font-mono text-sm">{String(Math.floor(rec.seconds / 60)).padStart(2, "0")}:{String(rec.seconds % 60).padStart(2, "0")}</span><button onClick={rec.stop} className="btn-ghost ml-auto"><Square size={14} className="fill-rose-400 text-rose-400" />Stop</button></div>)
              : <button onClick={rec.start} className="btn-ghost w-full"><Mic size={16} />Record from microphone</button>}
            {rec.error && <p className="text-xs text-rose-400">{rec.error}</p>}</div>)
            : (<div className="space-y-3"><div className="flex items-center gap-2 text-sm"><FileAudio size={16} className="text-cyan-400" /><span className="truncate">{name}</span>
              <button className="ml-auto text-mute hover:text-rose-400" aria-label="Remove audio" onClick={() => { setAudio(null); rec.reset(); setRes(null); }}><Trash2 size={16} /></button></div><Waveform blob={audio} /></div>)}</div>}

        <button className="btn-primary w-full !py-3.5 text-base" disabled={!ready || busy} onClick={run}>{busy ? <Spinner label="Analyzing…" /> : <><Sparkles size={18} />Analyze {MODES.find((m) => m.id === mode)!.label}</>}</button>
        {!ready && !busy && <p className="-mt-3 text-center text-xs text-mute">{needsText && text.trim().length < 2 ? "Enter some text" : ""}{needsText && needsAudio && text.trim().length < 2 && !audio ? " and " : ""}{needsAudio && !audio ? "add audio" : ""} to continue.</p>}
      </div>

      <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        {busy && <div className="card p-10"><Spinner label="Running models on the backend…" /></div>}
        {err && !busy && <ErrorState message={err} onRetry={ready ? run : undefined} />}
        {!busy && !err && !res && <EmptyState icon={<Sparkles />} title="Results will appear here" body="Choose a mode, provide input, and run the analysis. You'll get the prediction, probabilities, measured features and an explanation." />}
        {res && !busy && <><Results r={res} />{res.mode !== "text" && <Link to="/speech" className="btn-ghost w-full">Open full Speech Intelligence dashboard <ArrowRight size={14} /></Link>}</>}
        <Notice>Predictions are research-grade estimates from small models trained on ~690 sitcom utterances. They are not reliable for real decisions.</Notice>
      </div></div></div>);
}
