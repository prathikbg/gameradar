import { useMemo, useState } from "react";
import { ExternalLink, Tv } from "lucide-react";
import Countdown, { useNow } from "../components/Countdown";
import { SHOWCASES, PAST_SHOWCASES } from "../data/showcases";

const FILTERS = [
  { k: "all", l: "All" }, { k: "nintendo", l: "Nintendo Direct" }, { k: "playstation", l: "State of Play" },
  { k: "xbox", l: "Xbox" }, { k: "multi", l: "Big events" },
];
const COLORS = { nintendo: "#FF3860", playstation: "#3B82F6", xbox: "#10B981", multi: "#FF9F1C" };
const fmt = (iso) => new Date(iso).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

const Status = ({ s }) => (
  <span className={`rounded px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest ${s === "confirmed" ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"}`}>
    {s === "confirmed" ? "Confirmed" : "Expected · date not yet announced"}
  </span>
);

const Featured = ({ e, now }) => (
  <section className="corner glass relative overflow-hidden rounded-2xl p-6 sm:p-10" data-testid="showcase-featured">
    <div className="scanlines pointer-events-none absolute inset-0 opacity-30" />
    <div className="relative space-y-5">
      <p className="font-mono text-xs uppercase tracking-[0.25em] text-[#00F0FF]">Next up</p>
      <h2 className="font-display text-3xl font-black uppercase leading-none sm:text-5xl">{e.name}</h2>
      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400"><Status s={e.status} /><span>{fmt(e.start)}</span><span>· {e.org}</span></div>
      <Countdown target={e.start} now={now} big testId="showcase-featured-countdown" />
      <p className="max-w-2xl text-slate-300">{e.blurb}</p>
      <a href={e.watch} target="_blank" rel="noreferrer" data-testid="showcase-featured-watch" className="inline-flex items-center gap-2 rounded-full bg-[#FF9F1C] px-5 py-2.5 font-bold text-black transition-transform hover:scale-105">
        <Tv className="h-4 w-4" /> Where to watch
      </a>
    </div>
  </section>
);

const Row = ({ e, now }) => (
  <div className="fade-up flex flex-col gap-4 rounded-xl border border-white/5 bg-[#0E1117] p-5 md:flex-row md:items-center" data-testid={`showcase-${e.id}`}
    style={{ borderLeft: `3px solid ${COLORS[e.platform]}` }}>
    <div className="min-w-0 flex-1 space-y-1.5">
      <div className="flex flex-wrap items-center gap-2"><h3 className="font-display text-xl font-bold">{e.name}</h3><Status s={e.status} /></div>
      <p className="font-mono text-xs text-slate-500">{fmt(e.start)} · {e.org}</p>
      <p className="text-sm text-slate-400">{e.blurb}</p>
    </div>
    <Countdown target={e.start} now={now} testId={`showcase-countdown-${e.id}`} />
    <a href={e.watch} target="_blank" rel="noreferrer" data-testid={`showcase-watch-${e.id}`} className="flex items-center gap-1 text-sm font-semibold text-[#00F0FF] hover:underline">Watch <ExternalLink className="h-3 w-3" /></a>
  </div>
);

export default function Showcases() {
  const now = useNow();
  const [f, setF] = useState("all");
  const upcoming = useMemo(() => SHOWCASES.filter((e) => new Date(e.start).getTime() > Date.now() - 3 * 3600000)
    .sort((a, b) => a.start.localeCompare(b.start)), []);
  const list = upcoming.filter((e) => f === "all" || e.platform === f);
  const past = PAST_SHOWCASES.filter((e) => f === "all" || e.platform === f);

  return (
    <div className="mx-auto max-w-5xl space-y-10 px-4 py-10 sm:px-6 lg:px-12">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-[#00F0FF]">Showcase season</p>
        <h1 className="font-display mt-2 text-4xl font-black uppercase tracking-tight sm:text-5xl lg:text-6xl">Showcase countdown</h1>
        <p className="mt-3 max-w-2xl text-sm text-slate-400">Nintendo, Sony and Microsoft usually announce their shows only a few days ahead. "Expected" dates are based on past years and will change once the show is announced.</p>
      </div>
      {list[0] && <Featured e={list[0]} now={now} />}
      <div className="no-scrollbar flex gap-2 overflow-x-auto">
        {FILTERS.map((x) => (
          <button key={x.k} data-testid={`showcase-filter-${x.k}`} onClick={() => setF(x.k)}
            className={`whitespace-nowrap rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${f === x.k ? "border-[#FF9F1C] bg-[#FF9F1C] text-black" : "border-white/10 text-slate-300 hover:border-white/30"}`}>{x.l}</button>
        ))}
      </div>
      <div className="space-y-3" data-testid="showcase-list">
        {list.slice(1).map((e) => <Row key={e.id} e={e} now={now} />)}
        {list.length === 0 && <p className="text-slate-400" data-testid="showcase-empty">No upcoming shows in this category yet.</p>}
      </div>
      {past.length > 0 && (
        <section>
          <h2 className="font-display mb-4 text-2xl font-extrabold uppercase">Recently aired</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {past.map((e) => (
              <a key={e.id} href={`https://www.youtube.com/results?search_query=${encodeURIComponent(e.name + " " + e.date.slice(0, 4))}`} target="_blank" rel="noreferrer"
                data-testid={`past-showcase-${e.id}`} className="flex items-center justify-between rounded-xl border border-white/5 bg-[#0E1117] p-4 transition-[border-color] hover:border-white/20">
                <div><p className="font-semibold">{e.name}</p><p className="font-mono text-xs text-slate-500">{new Date(e.date + "T12:00:00Z").toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}</p></div>
                <span className="flex items-center gap-1 text-xs text-slate-400">Replay <ExternalLink className="h-3 w-3" /></span>
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
