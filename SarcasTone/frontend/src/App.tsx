import { Route, Routes, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import Navbar from "./components/Navbar";
import { ToastProvider } from "./components/Toast";
import { AnalysisProvider } from "./components/AnalysisContext";
import { useTheme } from "./hooks/useTheme";
import Landing from "./pages/Landing"; import Studio from "./pages/Studio"; import Speech from "./pages/Speech";
import Models from "./pages/Models"; import Dataset from "./pages/Dataset"; import Research from "./pages/Research";
import { EmptyState } from "./components/ui";

const Page = ({ children }: { children: React.ReactNode }) => <motion.main initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: .25 }}>{children}</motion.main>;
export default function App() {
  const { dark, toggle } = useTheme(); const loc = useLocation();
  return (<ToastProvider><AnalysisProvider><Navbar dark={dark} toggle={toggle} />
    <AnimatePresence mode="wait"><Routes location={loc} key={loc.pathname}>
      <Route path="/" element={<Page><Landing /></Page>} /><Route path="/studio" element={<Page><Studio /></Page>} /><Route path="/speech" element={<Page><Speech /></Page>} />
      <Route path="/models" element={<Page><Models /></Page>} /><Route path="/dataset" element={<Page><Dataset /></Page>} /><Route path="/research" element={<Page><Research /></Page>} />
      <Route path="*" element={<Page><div className="mx-auto max-w-xl p-10"><EmptyState title="Page not found" body="That route doesn't exist." /></div></Page>} /></Routes></AnimatePresence></AnalysisProvider></ToastProvider>);
}
