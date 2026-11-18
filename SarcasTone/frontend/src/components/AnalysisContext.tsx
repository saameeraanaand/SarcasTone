import { createContext, useContext, useState, ReactNode } from "react";
import type { AudioResult } from "../services/api";
interface S { audio: Blob | null; name: string; result: AudioResult | null; set: (a: Blob | null, n: string, r: AudioResult | null) => void }
const C = createContext<S>({ audio: null, name: "", result: null, set: () => {} });
export const useAnalysis = () => useContext(C);
export function AnalysisProvider({ children }: { children: ReactNode }) {
  const [st, setSt] = useState({ audio: null as Blob | null, name: "", result: null as AudioResult | null });
  return <C.Provider value={{ ...st, set: (audio, name, result) => setSt({ audio, name, result }) }}>{children}</C.Provider>;
}
