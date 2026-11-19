import { motion } from "framer-motion";
import { Activity, AudioLines, Brain, Clock, Cpu, Gauge, Info, Pause } from "lucide-react";
import type { AudioResult, TextResult } from "../services/api";
import { Notice, ProbBars, Stat } from "./ui";

export default function Results({ r }: { r: TextResult | AudioResult }) {
  const pred = r.prediction; const isText = r.mode === "text"; const a = !isText ? (r as AudioResult).analysis : null; const ar = r as AudioResult;
  const sarc = pred?.label === "Sarcastic"; const sent = r.sentiment;
  const shift = !isText ? ar.domain_shift : null;
  return (<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
    {shift?.out_of_distribution && <Notice tone="warn"><b>Low-confidence recording.</b> {shift.note} (acoustic distance: {shift.mean_z_score.toFixed(1)}σ from training data)</Notice>}
    {pred ? (
      <div className="card relative overflow-hidden p-6">
        <div className={`absolute -right-16 -top-16 h-56 w-56 rounded-full blur-3xl ${sarc ? "bg-fuchsia-500/25" : "bg-cyan-500/25"}`} />
        <div className="relative grid gap-6 md:grid-cols-2"><div>
          <div className="label">Prediction</div>
          <motion.div initial={{ scale: .9 }} animate={{ scale: 1 }} className={`mt-1 text-4xl font-extrabold tracking-tight ${sarc ? "text-fuchsia-300" : "text-cyan-300"}`}>{pred.label}</motion.div>
          <div className="mt-1 text-sm text-mute">Model confidence <span className="font-mono text-ink">{(pred.confidence * 100).toFixed(1)}%</span></div>
          {r.model_cv_accuracy != null && <p className="mt-3 text-xs text-mute">For context: this model scored {(r.model_cv_accuracy * 100).toFixed(1)}% accuracy under speaker-independent cross-validation on MUStARD. Confidence is the model's probability, not a guarantee of correctness.</p>}
        </div><div><div className="label mb-3">Probability distribution</div><ProbBars probs={pred.probabilities} /></div></div></div>
    ) : <Notice tone="warn"><b>No sarcasm prediction for this mode.</b> {ar.explanation}</Notice>}

    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Stat label="Model" value={r.model ?? "—"} /><Stat label="Processing time" value={r.processing_ms.toFixed(0)} unit="ms" />
      {sent && <Stat label="Text sentiment" value={sent.label} hint={`VADER compound ${sent.compound.toFixed(2)} (pos ${sent.pos.toFixed(2)} / neg ${sent.neg.toFixed(2)})`} />}
      {ar.text_source && <Stat label="Text source" value={ar.text_source} hint="typed by you, not auto-transcribed" />}
    </div>

    {a && <div><div className="label mb-2">Measured speech indicators</div><div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Stat label="Mean pitch" value={a.pitch_mean_hz.toFixed(0)} unit="Hz" hint={`range ${a.pitch_range_hz.toFixed(0)} Hz · σ ${a.pitch_std_hz.toFixed(0)}`} />
      <Stat label="Mean energy (RMS)" value={a.rms_mean.toFixed(3)} />
      <Stat label="Speaking rate" value={a.speaking_rate_syll_per_s.toFixed(1)} unit="syll/s" hint="approximation from energy peaks" />
      <Stat label="Pauses" value={String(a.n_pauses)} hint={`${(a.pause_ratio * 100).toFixed(0)}% of speech time · ≥150 ms`} /></div></div>}

    {pred && <div className="card p-5"><div className="mb-2 flex items-center gap-2 font-semibold"><Info size={16} className="text-violet-400" />Why this prediction?</div>
      <p className="text-sm leading-relaxed text-mute">{r.explanation}</p>
      {r.top_terms.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{r.top_terms.map((t) => (
        <span key={t.term} className={`rounded-lg border px-2.5 py-1 font-mono text-xs ${t.weight > 0 ? "border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-300" : "border-cyan-500/30 bg-cyan-500/10 text-cyan-300"}`}>{t.term} {t.weight > 0 ? "+" : ""}{t.weight.toFixed(2)}</span>))}</div>}</div>}
  </motion.div>);
}
export const _icons = { Activity, AudioLines, Brain, Clock, Cpu, Gauge, Pause };
