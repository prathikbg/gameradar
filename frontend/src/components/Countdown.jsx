import { useEffect, useState } from "react";

const parts = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
};

export const useNow = () => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  return now;
};

export default function Countdown({ target, now, big = false, testId }) {
  const ms = new Date(target).getTime() - now;
  if (ms <= 0) return <span data-testid={testId} className="font-mono text-sm font-bold uppercase tracking-widest text-[#FF3860]">● Live now / aired</span>;
  const p = parts(ms);
  return (
    <div className="flex gap-2" data-testid={testId}>
      {[["d", "days"], ["h", "hrs"], ["m", "min"], ["s", "sec"]].map(([k, l]) => (
        <div key={k} className={`rounded-lg border border-white/10 bg-black/40 text-center ${big ? "min-w-[4.5rem] px-3 py-2" : "min-w-[3.2rem] px-2 py-1.5"}`}>
          <p className={`font-display font-black tabular-nums leading-none ${big ? "text-4xl sm:text-5xl" : "text-xl"}`}>{String(p[k]).padStart(2, "0")}</p>
          <p className="mt-1 font-mono text-[9px] uppercase tracking-widest text-slate-500">{l}</p>
        </div>
      ))}
    </div>
  );
}
