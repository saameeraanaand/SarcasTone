import { createContext, useCallback, useContext, useState, ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, AlertTriangle, Info } from "lucide-react";
type T = { id: number; kind: "success" | "error" | "info"; msg: string };
const Ctx = createContext<(kind: T["kind"], msg: string) => void>(() => {});
export const useToast = () => useContext(Ctx);
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<T[]>([]);
  const push = useCallback((kind: T["kind"], msg: string) => { const id = Date.now() + Math.random(); setItems((s) => [...s, { id, kind, msg }]); setTimeout(() => setItems((s) => s.filter((t) => t.id !== id)), 4500); }, []);
  const Icon = { success: CheckCircle2, error: AlertTriangle, info: Info };
  return (<Ctx.Provider value={push}>{children}
    <div className="fixed bottom-4 right-4 z-[100] flex w-[min(92vw,380px)] flex-col gap-2" role="status" aria-live="polite">
      <AnimatePresence>{items.map((t) => { const I = Icon[t.kind]; return (
        <motion.div key={t.id} initial={{ opacity: 0, y: 16, scale: .96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, x: 40 }}
          className="glass flex items-start gap-3 rounded-xl p-3 text-sm shadow-xl">
          <I size={18} className={t.kind === "error" ? "text-rose-400 mt-0.5" : t.kind === "success" ? "text-emerald-400 mt-0.5" : "text-cyan-400 mt-0.5"} /><span>{t.msg}</span>
        </motion.div>); })}</AnimatePresence></div></Ctx.Provider>);
}
