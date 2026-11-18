import { useState } from "react";
import { NavLink, Link } from "react-router-dom";
import { Menu, Moon, Sun, X, AudioLines } from "lucide-react";
const links = [["/studio", "Studio"], ["/speech", "Speech"], ["/models", "Models"], ["/dataset", "Dataset"], ["/research", "Research"]];
export const Logo = ({ size = 32 }: { size?: number }) => (
  <span className="flex items-center gap-2.5 font-bold tracking-tight"><span className="grid place-items-center rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 text-white shadow-lg shadow-violet-900/40" style={{ width: size, height: size }}><AudioLines size={size * .56} /></span>
    <span className="text-lg">Sarcas<span className="grad-text">Tone</span></span></span>);
export default function Navbar({ dark, toggle }: { dark: boolean; toggle: () => void }) {
  const [open, setOpen] = useState(false);
  const cls = ({ isActive }: { isActive: boolean }) => `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isActive ? "bg-ink/10 text-ink" : "text-mute hover:text-ink"}`;
  return (<header className="glass sticky top-0 z-40 border-x-0 border-t-0"><div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">
    <Link to="/" aria-label="SarcasTone home"><Logo /></Link>
    <nav className="hidden items-center gap-1 md:flex">{links.map(([to, l]) => <NavLink key={to} to={to} className={cls}>{l}</NavLink>)}</nav>
    <div className="flex items-center gap-2"><button onClick={toggle} className="btn-ghost !p-2.5" aria-label="Toggle theme">{dark ? <Sun size={16} /> : <Moon size={16} />}</button>
      <Link to="/studio" className="btn-primary hidden sm:inline-flex">Launch Studio</Link>
      <button className="btn-ghost !p-2.5 md:hidden" onClick={() => setOpen(!open)} aria-label="Menu">{open ? <X size={16} /> : <Menu size={16} />}</button></div></div>
    {open && <nav className="flex flex-col gap-1 border-t border-line p-3 md:hidden">{links.map(([to, l]) => <NavLink key={to} to={to} className={cls} onClick={() => setOpen(false)}>{l}</NavLink>)}</nav>}</header>);
}
