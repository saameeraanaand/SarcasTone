import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api, ModelMetrics } from "../services/api";
import { useAsync } from "../hooks/useAsync";
import { ErrorState, Notice, PageHeader, Skeleton } from "../components/ui";

const NAMES: Record<string, string> = { text_only: "Text-only", speech_only: "Speech-only", multimodal: "Multimodal" };
const COL: Record<string, string> = { text_only: "#8b5cf6", speech_only: "#22d3ee", multimodal: "#f472b6" };
const tip = { contentStyle: { background: "rgb(15 19 36)", border: "1px solid rgb(38 45 70)", borderRadius: 12, fontSize: 12, color: "#ecf0fc" } };

function Confusion({ m }: { m: ModelMetrics }) {
  const c = m.confusion_matrix, max = Math.max(...c.flat()), L = ["Non-sarc.", "Sarcastic"];
  return (<div className="grid grid-cols-[auto_1fr_1fr] gap-1.5 text-center text-xs"><div />{L.map((l) => <div key={l} className="text-mute">pred: {l}</div>)}
    {c.map((row, i) => [<div key={"l" + i} className="self-center text-right text-mute">true: {L[i]}</div>, ...row.map((v, j) => (
      <div key={`${i}${j}`} className="grid h-16 place-items-center rounded-lg font-mono text-lg font-bold" style={{ background: `rgba(139,92,246,${0.12 + 0.6 * v / max})` }}>{v}</div>))])}</div>);
}

export default function Models() {
  const { data, error, loading, reload } = useAsync(api.metrics, []); const ex = useAsync(api.exploratory, []);
  const ms = data ? Object.entries(data.models) : [];
  const bars = ["accuracy", "precision", "recall", "f1", "roc_auc"].map((k) => ({ metric: k === "roc_auc" ? "ROC-AUC" : k === "f1" ? "F1" : k[0].toUpperCase() + k.slice(1),
    ...Object.fromEntries(ms.map(([id, m]) => [id, +(m as unknown as Record<string, number>)[k].toFixed(3)])) }));
  const roc = (() => { const grid = Array.from({ length: 51 }, (_, i) => i / 50); return grid.map((x) => ({ fpr: x, ...Object.fromEntries(ms.map(([id, m]) => {
    const { fpr, tpr } = m.roc_curve; let j = fpr.findIndex((f) => f >= x); if (j < 0) j = fpr.length - 1; return [id, tpr[j]]; })) })); })();
  return (<div className="mx-auto max-w-7xl px-4 py-10 md:px-6">
    <PageHeader title="Model Comparison" sub="Text-only vs speech-only vs multimodal. All values are read from results/metrics.json, written by the training script. Evaluation: 5-fold cross-validation where no speaker appears in both train and test." />
    {loading && <div className="grid gap-4 md:grid-cols-3"><Skeleton className="h-40" /><Skeleton className="h-40" /><Skeleton className="h-40" /></div>}
    {error && <ErrorState message={error} onRetry={reload} />}
    {data && (<div className="space-y-6">
      {data.notes.map((n) => <Notice key={n} tone="warn"><b>Not available:</b> {n}</Notice>)}
      <div className="grid gap-4 md:grid-cols-3">{ms.map(([id, m]) => (
        <div key={id} className="card p-5"><div className="flex items-center justify-between"><h3 className="font-semibold">{NAMES[id]}</h3><span className="rounded-md bg-ink/10 px-2 py-0.5 text-xs text-mute">{m.input}</span></div>
          <div className="mt-3 text-4xl font-extrabold tabular-nums" style={{ color: COL[id] }}>{(m.accuracy * 100).toFixed(1)}<span className="text-lg text-mute">% acc</span></div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-mute"><div>Precision<div className="font-mono text-sm text-ink">{m.precision.toFixed(3)}</div></div><div>Recall<div className="font-mono text-sm text-ink">{m.recall.toFixed(3)}</div></div><div>F1<div className="font-mono text-sm text-ink">{m.f1.toFixed(3)}</div></div></div>
          <div className="mt-3 text-xs text-mute">n = {m.n_samples} · train {m.train_time_s_total_5folds.toFixed(2)} s (5 folds) · inference {m.inference_time_ms_per_sample.toFixed(2)} ms/sample</div></div>))}</div>
      {ms.length > 0 && <div className="grid gap-5 lg:grid-cols-2">
        <div className="card p-5"><h3 className="mb-3 font-semibold">Metrics comparison</h3><div className="h-72"><ResponsiveContainer><BarChart data={bars}><CartesianGrid stroke="rgb(38 45 70)" strokeDasharray="3 3" /><XAxis dataKey="metric" stroke="#8b95b2" fontSize={11} /><YAxis domain={[0, 1]} stroke="#8b95b2" fontSize={11} width={30} /><Tooltip {...tip} cursor={{ fill: "rgba(139,92,246,.1)" }} /><Legend formatter={(v) => NAMES[v]} />
          {ms.map(([id]) => <Bar key={id} dataKey={id} fill={COL[id]} radius={[5, 5, 0, 0]} />)}</BarChart></ResponsiveContainer></div></div>
        <div className="card p-5"><h3 className="mb-1 font-semibold">ROC curves</h3><p className="mb-2 text-xs text-mute">Out-of-fold predictions; dashed line = chance. AUC: {ms.map(([id, m]) => `${NAMES[id]} ${m.roc_auc.toFixed(3)}`).join(" · ")}</p>
          <div className="h-64"><ResponsiveContainer><LineChart data={roc}><CartesianGrid stroke="rgb(38 45 70)" strokeDasharray="3 3" /><XAxis dataKey="fpr" type="number" domain={[0, 1]} stroke="#8b95b2" fontSize={11} /><YAxis domain={[0, 1]} stroke="#8b95b2" fontSize={11} width={30} /><Tooltip {...tip} formatter={(v: number) => v.toFixed(3)} labelFormatter={(l) => `FPR ${Number(l).toFixed(2)}`} />
            <Line dataKey="fpr" stroke="#64748b" strokeDasharray="5 5" dot={false} name="chance" legendType="none" />{ms.map(([id]) => <Line key={id} dataKey={id} name={NAMES[id]} stroke={COL[id]} strokeWidth={2.5} dot={false} />)}</LineChart></ResponsiveContainer></div></div></div>}
      <div className="grid gap-5 md:grid-cols-3">{ms.map(([id, m]) => <div key={id} className="card p-5"><h3 className="mb-3 font-semibold">{NAMES[id]} — confusion matrix</h3><Confusion m={m} /></div>)}</div>
      {ex.data && ex.data.length > 0 && <div className="card p-5"><h3 className="font-semibold">Exploratory: why the evaluation protocol matters (text-only)</h3>
        <p className="mb-3 mt-1 text-sm text-mute">Not the official result. Shows that random splits flatter the model because the same speakers and shows appear in train and test.</p>
        <div className="space-y-2">{ex.data.map((e) => <div key={e.setting} className="flex items-center gap-3 text-sm"><span className="w-full max-w-md">{e.setting}</span><div className="h-2 flex-1 rounded bg-ink/10"><div className="h-full rounded bg-violet-500" style={{ width: `${e.accuracy * 100}%` }} /></div><span className="w-14 text-right font-mono">{(e.accuracy * 100).toFixed(1)}%</span></div>)}</div></div>}
    </div>)}</div>);
}
