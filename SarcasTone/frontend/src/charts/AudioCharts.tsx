import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { AudioAnalysis } from "../services/api";
const ax = { stroke: "rgb(139 149 178)", fontSize: 11, tickLine: false, axisLine: false } as const;
const tip = { contentStyle: { background: "rgb(15 19 36)", border: "1px solid rgb(38 45 70)", borderRadius: 12, fontSize: 12, color: "#ecf0fc" }, labelStyle: { color: "#a78bfa" } };
const Wrap = ({ title, sub, children, h = 220 }: { title: string; sub?: string; children: React.ReactNode; h?: number }) => (
  <div className="card p-5"><div className="mb-3"><h3 className="font-semibold">{title}</h3>{sub && <p className="text-xs text-mute">{sub}</p>}</div><div style={{ height: h }}>{children}</div></div>);

export function WaveformChart({ a }: { a: AudioAnalysis }) {
  const d = a.waveform.map((v, i) => ({ t: +(i / a.waveform.length * a.duration_s).toFixed(2), amp: v }));
  return (<Wrap title="Waveform (amplitude envelope)" h={180}><ResponsiveContainer><AreaChart data={d}><defs><linearGradient id="wf" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8b5cf6" stopOpacity={.7} /><stop offset="100%" stopColor="#8b5cf6" stopOpacity={.05} /></linearGradient></defs>
    <XAxis dataKey="t" {...ax} unit="s" /><YAxis {...ax} width={32} /><Tooltip {...tip} formatter={(v: number) => v.toFixed(3)} /><Area dataKey="amp" stroke="#a78bfa" fill="url(#wf)" strokeWidth={1.5} isAnimationActive /></AreaChart></ResponsiveContainer></Wrap>);
}
export function PitchChart({ a }: { a: AudioAnalysis }) {
  const d = a.pitch_t.map((t, i) => ({ t: +t.toFixed(2), hz: a.pitch_hz[i] }));
  const voiced = d.filter((x) => x.hz != null).length;
  return (<Wrap title="Pitch contour (F0)" sub={voiced ? "pYIN estimate; gaps are unvoiced or silent frames" : "No voiced frames detected"}><ResponsiveContainer><LineChart data={d}><CartesianGrid stroke="rgb(38 45 70)" strokeDasharray="3 3" />
    <XAxis dataKey="t" {...ax} unit="s" /><YAxis {...ax} width={44} unit=" Hz" domain={["auto", "auto"]} /><Tooltip {...tip} formatter={(v: number) => `${Math.round(v)} Hz`} />
    <Line dataKey="hz" stroke="#22d3ee" strokeWidth={2} dot={false} connectNulls={false} /></LineChart></ResponsiveContainer></Wrap>);
}
export function EnergyChart({ a }: { a: AudioAnalysis }) {
  const d = a.energy_t.map((t, i) => ({ t: +t.toFixed(2), rms: a.energy[i] }));
  return (<Wrap title="Energy / intensity (RMS)"><ResponsiveContainer><AreaChart data={d}><defs><linearGradient id="en" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#22d3ee" stopOpacity={.6} /><stop offset="100%" stopColor="#22d3ee" stopOpacity={.03} /></linearGradient></defs>
    <CartesianGrid stroke="rgb(38 45 70)" strokeDasharray="3 3" /><XAxis dataKey="t" {...ax} unit="s" /><YAxis {...ax} width={40} /><Tooltip {...tip} formatter={(v: number) => v.toFixed(4)} />
    <Area dataKey="rms" stroke="#22d3ee" fill="url(#en)" strokeWidth={2} /></AreaChart></ResponsiveContainer></Wrap>);
}
export function PauseChart({ a }: { a: AudioAnalysis }) {
  if (!a.pauses.length) return (<Wrap title="Pause distribution" h={90}><p className="text-sm text-mute">No pauses ≥ 150 ms detected.</p></Wrap>);
  const d = a.pauses.map((p, i) => ({ n: `#${i + 1} @${p.start.toFixed(2)}s`, ms: Math.round(p.duration * 1000) }));
  return (<Wrap title="Pause distribution" sub="Silent gaps ≥ 150 ms (energy below 10% of peak)"><ResponsiveContainer><BarChart data={d}><CartesianGrid stroke="rgb(38 45 70)" strokeDasharray="3 3" />
    <XAxis dataKey="n" {...ax} /><YAxis {...ax} width={40} unit=" ms" /><Tooltip {...tip} cursor={{ fill: "rgba(139,92,246,.1)" }} /><Bar dataKey="ms" fill="#8b5cf6" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></Wrap>);
}
export function MfccHeatmap({ a }: { a: AudioAnalysis }) {
  const flat = a.mfcc.flat(); const lo = Math.min(...flat), hi = Math.max(...flat);
  const color = (v: number) => { const x = (v - lo) / (hi - lo || 1); return `hsl(${260 - x * 80} ${60 + x * 25}% ${14 + x * 50}%)`; };
  return (<Wrap title="MFCC heatmap" sub="13 coefficients over time (row 1 = bottom). Hover a cell for its value." h={230}>
    <div className="flex h-full flex-col-reverse gap-px overflow-hidden rounded-lg">{a.mfcc.map((row, i) => (
      <div key={i} className="flex flex-1 gap-px">{row.map((v, j) => <div key={j} title={`MFCC ${i + 1}, frame ${j}: ${v.toFixed(1)}`} className="flex-1" style={{ background: color(v) }} />)}</div>))}</div></Wrap>);
}
