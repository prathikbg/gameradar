import { Radar } from "lucide-react";

export default function Footer() {
  return (
    <footer className="mt-24 border-t border-white/10">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-10 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-12">
        <div className="flex items-center gap-2">
          <Radar className="h-4 w-4 text-[#FF9F1C]" />
          <span className="font-display font-bold uppercase text-slate-300">GameRadar</span>
          <span>— every game, on your radar.</span>
        </div>
        <span className="font-mono text-xs uppercase tracking-widest">Game data by RAWG.io</span>
      </div>
    </footer>
  );
}
