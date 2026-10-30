import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import useApi from "../hooks/useApi";
import PlatformFilter from "../components/PlatformFilter";
import { PlatformTags, WishButton } from "../components/GameCard";

const daysUntil = (d) => Math.ceil((new Date(d + "T00:00:00") - new Date()) / 86400000);
const monthKey = (d) => d.slice(0, 7);
const monthLabel = (k) => new Date(k + "-01T00:00:00").toLocaleDateString(undefined, { month: "long", year: "numeric" });

const Item = ({ g }) => {
  const dt = new Date(g.released + "T00:00:00");
  const left = daysUntil(g.released);
  return (
    <Link to={`/game/${g.id}`} data-testid={`calendar-item-${g.id}`}
      className="group flex items-center gap-4 rounded-xl border border-white/5 bg-[#0E1117] p-3 transition-[border-color] hover:border-[#00F0FF]/40">
      <div className="w-14 shrink-0 text-center">
        <p className="font-mono text-[10px] uppercase tracking-widest text-[#FF9F1C]">{dt.toLocaleDateString(undefined, { weekday: "short" })}</p>
        <p className="font-display text-3xl font-black leading-none">{dt.getDate()}</p>
      </div>
      {g.background_image && <img src={g.background_image} alt="" className="h-14 w-24 shrink-0 rounded object-cover" />}
      <div className="min-w-0 flex-1 space-y-1">
        <p className="font-display truncate font-bold">{g.name}</p>
        <PlatformTags platforms={g.platforms} />
      </div>
      <span className="hidden whitespace-nowrap font-mono text-xs text-[#00F0FF] sm:block">T-{left}d</span>
      <WishButton game={g} />
    </Link>
  );
};

export default function CalendarPage() {
  const [platform, setPlatform] = useState("all");
  const [month, setMonth] = useState("all");
  const { data, loading, error } = useApi("/games/upcoming", { platform });

  const groups = useMemo(() => {
    const m = {};
    (data?.results || []).filter((g) => g.released).forEach((g) => { (m[monthKey(g.released)] ||= []).push(g); });
    return m;
  }, [data]);
  const months = Object.keys(groups).sort();
  const shown = month === "all" ? months : months.filter((k) => k === month);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-12">
      <p className="font-mono text-xs uppercase tracking-[0.25em] text-[#00F0FF]">Next 12 months</p>
      <h1 className="font-display mt-2 text-4xl font-black uppercase tracking-tight sm:text-5xl lg:text-6xl">Release calendar</h1>
      <div className="mt-8"><PlatformFilter value={platform} onChange={(p) => { setPlatform(p); setMonth("all"); }} /></div>
      <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto" data-testid="calendar-month-filter">
        {["all", ...months].map((k) => (
          <button key={k} data-testid={`calendar-month-${k}`} onClick={() => setMonth(k)}
            className={`whitespace-nowrap rounded-md px-3 py-1.5 font-mono text-xs uppercase tracking-widest transition-colors ${month === k ? "bg-[#00F0FF] text-black" : "bg-white/5 text-slate-400 hover:text-white"}`}>
            {k === "all" ? "All months" : monthLabel(k)}
          </button>
        ))}
      </div>
      <div className="mt-10 space-y-12">
        {loading ? <div className="h-64 animate-pulse rounded-xl bg-slate-800/60" /> :
          error ? <p className="text-red-400">{error}</p> :
          shown.length === 0 ? <p className="text-slate-400" data-testid="calendar-empty">No dated releases found.</p> :
          shown.map((k) => (
            <section key={k} data-testid={`calendar-group-${k}`}>
              <h2 className="font-display mb-4 flex items-center gap-3 text-2xl font-extrabold uppercase">
                {monthLabel(k)} <span className="font-mono text-xs text-slate-500">{groups[k].length} games</span>
              </h2>
              <div className="space-y-3">{groups[k].map((g) => <Item key={g.id} g={g} />)}</div>
            </section>
          ))}
      </div>
    </div>
  );
}
