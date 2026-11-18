import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Search, Volume2, VolumeX } from "lucide-react";
import { api } from "../services/api";
import { useAsync } from "../hooks/useAsync";
import { EmptyState, ErrorState, Notice, PageHeader, Skeleton, Stat } from "../components/ui";

const tip = { contentStyle: { background: "rgb(15 19 36)", border: "1px solid rgb(38 45 70)", borderRadius: 12, fontSize: 12, color: "#ecf0fc" } };
export default function Dataset() {
  const ov = useAsync(api.overview, []); const [q, setQ] = useState(""); const [label, setLabel] = useState("all"); const [show, setShow] = useState("all"); const [page, setPage] = useState(0);
  const [dq, setDq] = useState(""); useEffect(() => { const t = setTimeout(() => { setDq(q); setPage(0); }, 300); return () => clearTimeout(t); }, [q]);
  const list = useAsync(() => api.samples(dq, label, show, page * 12), [dq, label, show, page]);
  const o = ov.data;
  return (<div className="mx-auto max-w-7xl px-4 py-10 md:px-6">
    <PageHeader title="Dataset Explorer" sub="MUStARD — multimodal sarcasm dataset of utterances from TV sitcoms. Statistics are computed live from the local copy." />
    {ov.loading && <Skeleton className="h-32" />}{ov.error && <ErrorState message={ov.error} onRetry={ov.reload} />}
    {o && (<div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5"><Stat label="Total samples" value={String(o.total)} /><Stat label="Sarcastic" value={String(o.sarcastic)} /><Stat label="Non-sarcastic" value={String(o.non_sarcastic)} />
        <Stat label="Missing values" value={String(o.missing_values)} /><Stat label="Audio clips found" value={`${o.audio_available}/${o.total}`} hint="in dataset/audio/" /></div>
      {o.audio_available < o.total && <Notice tone="warn">Audio clips are not present locally, so speech-based models cannot be trained or used for prediction until they are added (see README, “Getting the audio”).</Notice>}
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="card p-5"><h3 className="mb-2 font-semibold">Class distribution</h3><div className="h-52"><ResponsiveContainer><PieChart><Pie data={[{ n: "Sarcastic", v: o.sarcastic }, { n: "Non-sarcastic", v: o.non_sarcastic }]} dataKey="v" nameKey="n" innerRadius={50} outerRadius={80} paddingAngle={3} stroke="none"><Cell fill="#d946ef" /><Cell fill="#22d3ee" /></Pie><Tooltip {...tip} /></PieChart></ResponsiveContainer></div></div>
        <div className="card p-5 lg:col-span-2"><h3 className="mb-2 font-semibold">By show</h3><div className="h-52"><ResponsiveContainer><BarChart data={o.by_show}><CartesianGrid stroke="rgb(38 45 70)" strokeDasharray="3 3" /><XAxis dataKey="show" stroke="#8b95b2" fontSize={11} /><YAxis stroke="#8b95b2" fontSize={11} width={30} /><Tooltip {...tip} cursor={{ fill: "rgba(139,92,246,.1)" }} />
          <Bar dataKey="sarcastic" fill="#d946ef" radius={[5, 5, 0, 0]} /><Bar dataKey="non_sarcastic" fill="#22d3ee" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></div></div></div>
      <Notice>{o.n_speakers} distinct speakers; the largest contributes {Math.max(...Object.values(o.top_speakers))} utterances ({(Math.max(...Object.values(o.top_speakers)) / o.total * 100).toFixed(0)}%). Source: {o.source}. Used for academic research under the dataset's own terms; clips are not redistributed here.</Notice>
    </div>)}
    <div className="mt-8"><div className="mb-4 flex flex-wrap gap-3"><div className="relative min-w-[220px] flex-1"><Search size={16} className="absolute left-3 top-3 text-mute" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search transcripts…" aria-label="Search transcripts" className="w-full rounded-xl border border-line bg-surface/70 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-violet-400" /></div>
      {[["label", label, setLabel, [["all", "All labels"], ["sarcastic", "Sarcastic"], ["non_sarcastic", "Non-sarcastic"]]], ["show", show, setShow, [["all", "All shows"], ...(o?.by_show.map((s) => [s.show, s.show]) ?? [])]]].map(([k, v, fn, opts]) => (
        <select key={k as string} value={v as string} onChange={(e) => { (fn as (s: string) => void)(e.target.value); setPage(0); }} aria-label={k as string} className="rounded-xl border border-line bg-surface px-3 py-2.5 text-sm">{(opts as string[][]).map(([val, l]) => <option key={val} value={val}>{l}</option>)}</select>))}</div>
      {list.error && <ErrorState message={list.error} onRetry={list.reload} />}
      {list.data && list.data.items.length === 0 && <EmptyState title="No matching samples" body="Try a different search term or clear the filters." />}
      <div className="space-y-2">{list.data?.items.map((s) => (<div key={s.id} className="card flex items-start gap-3 p-4"><span className={`mt-0.5 shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold ${s.label ? "bg-fuchsia-500/15 text-fuchsia-300" : "bg-cyan-500/15 text-cyan-300"}`}>{s.label ? "Sarcastic" : "Non-sarcastic"}</span>
        <div className="min-w-0 flex-1"><p className="text-sm">{s.text}</p><p className="mt-1 text-xs text-mute">{s.speaker} · {s.show} · <span className="font-mono">{s.id}</span></p></div>
        <span title={s.has_audio ? "Audio available" : "Audio not available locally"} className="text-mute">{s.has_audio ? <Volume2 size={16} className="text-emerald-400" /> : <VolumeX size={16} />}</span></div>))}</div>
      {list.data && <div className="mt-4 flex items-center justify-between text-sm text-mute"><span>{list.data.total} matches</span><div className="flex gap-2"><button className="btn-ghost" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</button><button className="btn-ghost" disabled={(page + 1) * 12 >= list.data.total} onClick={() => setPage(page + 1)}>Next</button></div></div>}</div></div>);
}
