import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import { Play, Pause, RotateCcw } from "lucide-react";

export default function Waveform({ blob, onDuration }: { blob: Blob; onDuration?: (d: number) => void }) {
  const el = useRef<HTMLDivElement>(null); const ws = useRef<WaveSurfer | null>(null);
  const [playing, setPlaying] = useState(false); const [dur, setDur] = useState(0); const [ready, setReady] = useState(false); const [err, setErr] = useState("");
  useEffect(() => {
    if (!el.current) return; setReady(false); setErr("");
    const w = WaveSurfer.create({ container: el.current, height: 84, waveColor: "rgba(139,92,246,.45)", progressColor: "#22d3ee", cursorColor: "#a78bfa", barWidth: 3, barGap: 2, barRadius: 3, normalize: true });
    ws.current = w;
    w.on("ready", (d) => { setDur(d); setReady(true); onDuration?.(d); }); w.on("play", () => setPlaying(true)); w.on("pause", () => setPlaying(false)); w.on("finish", () => setPlaying(false));
    w.on("error", () => setErr("This browser could not decode the audio for preview (the server may still be able to)."));
    w.loadBlob(blob); return () => w.destroy();
  }, [blob]); // eslint-disable-line
  return (<div className="rounded-xl border border-line bg-bg/40 p-4">
    <div ref={el} />{err && <p className="mt-2 text-xs text-amber-400">{err}</p>}
    <div className="mt-3 flex items-center gap-2">
      <button className="btn-ghost !px-3 !py-2" disabled={!ready} onClick={() => ws.current?.playPause()} aria-label={playing ? "Pause" : "Play"}>{playing ? <Pause size={16} /> : <Play size={16} />}</button>
      <button className="btn-ghost !px-3 !py-2" disabled={!ready} onClick={() => { ws.current?.seekTo(0); ws.current?.play(); }} aria-label="Replay"><RotateCcw size={16} /></button>
      <span className="ml-auto font-mono text-xs text-mute">{ready ? `${dur.toFixed(2)} s` : "loading…"}</span></div></div>);
}
