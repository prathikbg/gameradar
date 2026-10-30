import { Link } from "react-router-dom";
import { Radar } from "lucide-react";
import { openCookieSettings } from "./CookieConsent";

const LINKS = [["About", "/about"], ["Contact", "/contact"], ["Privacy policy", "/privacy"]];

export default function Footer() {
  return (
    <footer className="mt-24 border-t border-white/10">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-10 text-sm text-slate-500 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-12">
        <div className="flex items-center gap-2">
          <Radar className="h-4 w-4 text-[#FF9F1C]" />
          <span className="font-display font-bold uppercase text-slate-300">GameRadar</span>
          <span>— every game, on your radar.</span>
        </div>
        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {LINKS.map(([l, to]) => (
            <Link key={to} to={to} data-testid={`footer-link-${to.slice(1)}`} className="transition-colors hover:text-white">{l}</Link>
          ))}
          <button data-testid="footer-cookie-settings" onClick={openCookieSettings} className="transition-colors hover:text-white">Cookie settings</button>
          <span className="font-mono text-xs uppercase tracking-widest">Game data by RAWG.io</span>
        </nav>
      </div>
    </footer>
  );
}
