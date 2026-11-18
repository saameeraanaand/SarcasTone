import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, AudioLines, GitMerge, MessageSquareText } from "lucide-react";
import { api } from "../services/api";
import { useAsync } from "../hooks/useAsync";
import { Logo } from "../components/Navbar";

const BARS = 48;
function HeroWave() {
  return (<div className="flex h-28 items-center justify-center gap-[3px]" aria-hidden>{[...Array(BARS)].map((_, i) => {
    const base = 14 + 50 * Math.abs(Math.sin(i * .38) * Math.cos(i * .11));
    return <motion.span key={i} className="w-[4px] rounded-full bg-gradient-to-t from-violet-600 to-cyan-400" initial={{ height: 6 }}
      animate={{ height: [base * .5, base, base * .6] }} transition={{ duration: 1.6 + (i % 5) * .15, repeat: Infinity, ease: "easeInOut", delay: i * .03 }} />; })}</div>);
}
const features = [
  { icon: MessageSquareText, t: "Text Intelligence", d: "TF-IDF n-grams with a Logistic Regression classifier read the literal semantics of what was said, with the most influential words exposed." },
  { icon: AudioLines, t: "Voice Intelligence", d: "Pitch, energy, MFCCs, spectral shape, pauses and speaking-rate approximation, measured with Librosa from the actual waveform." },
  { icon: GitMerge, t: "Multimodal Fusion", d: "Feature-level fusion concatenates text and prosody features so one classifier can weigh both, then is compared fairly against each single-modality model." }];

export default function Landing() {
  const ov = useAsync(api.overview, []); const o = ov.data;
  return (<div className="relative overflow-hidden">
    <div className="pointer-events-none absolute inset-0 -z-10"><div className="absolute -left-32 -top-32 h-[520px] w-[520px] animate-drift rounded-full bg-violet-600/25 blur-[120px]" /><div className="absolute -right-24 top-40 h-[480px] w-[480px] animate-drift rounded-full bg-cyan-500/20 blur-[120px]" style={{ animationDelay: "-6s" }} />
      <div className="absolute inset-0 bg-[linear-gradient(rgb(var(--line)/.35)_1px,transparent_1px),linear-gradient(90deg,rgb(var(--line)/.35)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" /></div>
    <section className="mx-auto max-w-5xl px-4 pb-16 pt-20 text-center md:pt-28">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center">
        <span className="glass mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium text-mute"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400" />B.Tech research project · Multimodal sarcasm detection</span>
        <Logo size={44} />
        <h1 className="mt-8 text-5xl font-extrabold leading-[1.05] tracking-tight md:text-7xl">Detect the <span className="grad-text">Emotion</span> Behind Every Word.</h1>
        <p className="mt-3 text-lg font-medium text-violet-400">Beyond Words. Understanding Intent.</p>
        <p className="mx-auto mt-5 max-w-2xl text-mute md:text-lg">Sarcasm hides in the gap between what is said and how it is said. SarcasTone analyses the transcript, the speech prosody, and both together, and compares the three approaches honestly.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3"><Link to="/studio" className="btn-primary !px-6 !py-3.5 text-base">Launch AI Studio <ArrowRight size={18} /></Link><Link to="/research" className="btn-ghost !px-6 !py-3.5 text-base">How it works</Link></div></motion.div>
      <div className="glass mx-auto mt-14 max-w-2xl rounded-3xl p-6"><HeroWave /><p className="mt-2 text-xs text-mute">Decorative visual · real waveforms appear in the Studio</p></div>
      {o && <div className="mx-auto mt-8 flex max-w-xl flex-wrap justify-center gap-x-8 gap-y-2 text-sm text-mute"><span><b className="text-ink">{o.total}</b> MUStARD utterances</span><span><b className="text-ink">{o.n_speakers}</b> speakers</span><span><b className="text-ink">{o.sarcastic}/{o.non_sarcastic}</b> sarcastic / not</span></div>}
    </section>
    <section className="mx-auto grid max-w-6xl gap-4 px-4 pb-24 md:grid-cols-3 md:px-6">{features.map((f, i) => (
      <motion.div key={f.t} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * .1 }} whileHover={{ y: -4 }} className="card p-6">
        <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-violet-600/30 to-cyan-500/20 text-violet-300"><f.icon size={20} /></div><h3 className="text-lg font-semibold">{f.t}</h3><p className="mt-2 text-sm leading-relaxed text-mute">{f.d}</p></motion.div>))}</section>
    <footer className="border-t border-line py-6 text-center text-xs text-mute">SarcasTone · Dataset: MUStARD (Castro et al., ACL 2019) · Research prototype, not for production decisions</footer></div>);
}
