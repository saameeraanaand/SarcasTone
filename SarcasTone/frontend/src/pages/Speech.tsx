import { useState } from "react";
import { Link } from "react-router-dom";
import { Mic } from "lucide-react";
import { api } from "../services/api";
import { useAnalysis } from "../components/AnalysisContext";
import Waveform from "../components/Waveform";
import { EmptyState, ErrorState, PageHeader, Spinner, Stat } from "../components/ui";
import { EnergyChart, MfccHeatmap, PauseChart, PitchChart, WaveformChart } from "../charts/AudioCharts";
import { useToast } from "../components/Toast";

export default function Speech() {
  const { audio, name, result, set } = useAnalysis(); const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null); const toast = useToast();
  const a = result?.analysis;
  const onFile = async (f?: File) => {
    if (!f) return; setBusy(true); setErr(null);
    try { const r = await api.audio(f, f.name); set(f, f.name, r); } catch (e) { setErr((e as Error).message); toast("error", (e as Error).message); } finally { setBusy(false); }
  };
  return (<div className="mx-auto max-w-7xl px-4 py-10 md:px-6">
    <PageHeader title="Speech Intelligence" sub="Prosodic features measured from the audio with Librosa: pitch (pYIN), energy, MFCCs, pauses and speaking-rate approximation." />
    <label className="btn-ghost mb-6 cursor-pointer"><Mic size={16} />{a ? "Analyze a different file" : "Upload audio to analyze"}
      <input type="file" hidden accept=".wav,.mp3,.webm,.ogg,.m4a,.flac,audio/*" onChange={(e) => onFile(e.target.files?.[0])} /></label>
    {busy && <Spinner label="Extracting acoustic features…" />}
    {err && <ErrorState message={err} />}
    {!a && !busy && !err && <EmptyState icon={<Mic />} title="No audio analyzed yet" body="Upload a clip here, or run a Speech/Multimodal analysis in the Studio and it will show up here automatically."
      action={<Link to="/studio" className="btn-primary">Go to Studio</Link>} />}
    {a && result && !busy && (<div className="space-y-5">
      {audio && <div className="card p-5"><div className="label mb-3">{name}</div><Waveform blob={audio} /></div>}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Stat label="Duration" value={a.duration_s.toFixed(2)} unit="s" /><Stat label="Speaking rate" value={a.speaking_rate_syll_per_s.toFixed(1)} unit="syll/s" hint="approximate" />
        <Stat label="Mean pitch" value={a.pitch_mean_hz.toFixed(0)} unit="Hz" /><Stat label="Pitch range" value={a.pitch_range_hz.toFixed(0)} unit="Hz" />
        <Stat label="Pauses" value={String(a.n_pauses)} hint={`${(a.pause_ratio * 100).toFixed(0)}% of time`} /><Stat label="Voiced frames" value={(a.voiced_ratio * 100).toFixed(0)} unit="%" /></div>
      <div className="grid gap-5 lg:grid-cols-2"><WaveformChart a={a} /><PitchChart a={a} /><EnergyChart a={a} /><PauseChart a={a} /></div>
      <MfccHeatmap a={a} />
    </div>)}</div>);
}
