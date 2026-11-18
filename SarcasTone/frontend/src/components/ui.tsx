import { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Inbox, Loader2, X, RotateCw } from "lucide-react";

export const Spinner = ({ label }: { label?: string }) => (
  <div className="flex items-center gap-3 text-mute text-sm"><Loader2 className="animate-spin text-violet-400" size={18} />{label}</div>);
export const Skeleton = ({ className = "" }: { className?: string }) => (
  <div className={`relative overflow-hidden rounded-xl bg-ink/5 ${className}`}><div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-ink/10 to-transparent" /></div>);
export const EmptyState = ({ icon, title, body, action }: { icon?: ReactNode; title: string; body: string; action?: ReactNode }) => (
  <div className="card flex flex-col items-center gap-3 p-10 text-center"><div className="rounded-2xl bg-violet-500/10 p-3 text-violet-400">{icon ?? <Inbox />}</div>
    <h3 className="font-semibold">{title}</h3><p className="max-w-md text-sm text-mute">{body}</p>{action}</div>);
export const ErrorState = ({ message, onRetry }: { message: string; onRetry?: () => void }) => (
  <div className="card flex flex-col items-center gap-3 border-rose-500/30 p-8 text-center"><AlertTriangle className="text-rose-400" />
    <p className="max-w-md text-sm">{message}</p>{onRetry && <button className="btn-ghost" onClick={onRetry}><RotateCw size={14} />Retry</button>}</div>);
export const Notice = ({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "warn" }) => (
  <div className={`rounded-xl border p-4 text-sm leading-relaxed ${tone === "warn" ? "border-amber-500/30 bg-amber-500/5" : "border-cyan-500/20 bg-cyan-500/5"}`}>{children}</div>);
export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  return (<AnimatePresence>{open && (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div role="dialog" aria-modal className="card w-full max-w-lg p-6" initial={{ scale: .94, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: .96, opacity: 0 }} onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between"><h3 className="text-lg font-semibold">{title}</h3><button onClick={onClose} aria-label="Close" className="rounded-lg p-1 hover:bg-ink/10"><X size={18} /></button></div>{children}
      </motion.div></motion.div>)}</AnimatePresence>);
}
export const Stat = ({ label, value, unit, hint }: { label: string; value: string; unit?: string; hint?: string }) => (
  <div className="card p-4"><div className="label">{label}</div><div className="mt-1 text-2xl font-bold tabular-nums">{value}<span className="ml-1 text-sm font-medium text-mute">{unit}</span></div>{hint && <div className="mt-1 text-xs text-mute">{hint}</div>}</div>);
export const PageHeader = ({ title, sub }: { title: string; sub: string }) => (
  <div className="mb-8"><h1 className="text-3xl font-bold tracking-tight md:text-4xl">{title}</h1><p className="mt-2 max-w-3xl text-mute">{sub}</p></div>);
export const ProbBars = ({ probs }: { probs: Record<string, number> }) => (
  <div className="space-y-3">{Object.entries(probs).map(([k, v]) => (
    <div key={k}><div className="mb-1 flex justify-between text-sm"><span>{k}</span><span className="font-mono tabular-nums">{(v * 100).toFixed(1)}%</span></div>
      <div className="h-2.5 overflow-hidden rounded-full bg-ink/10"><motion.div className={`h-full rounded-full ${k === "Sarcastic" ? "bg-gradient-to-r from-violet-500 to-fuchsia-400" : "bg-gradient-to-r from-cyan-500 to-emerald-400"}`}
        initial={{ width: 0 }} animate={{ width: `${v * 100}%` }} transition={{ duration: .9, ease: "easeOut" }} /></div></div>))}</div>);
