import { useState } from "react";
import { Link } from "react-router-dom";
import { Star, Users, Clock } from "lucide-react";
import useApi from "../hooks/useApi";
import PlatformFilter from "../components/PlatformFilter";
import { Metascore, PlatformTags, WishButton } from "../components/GameCard";
import { fmtDate } from "../lib/api";
import Skeletons from "../components/Skeletons";

const KINDS = [
  { k: "trending", l: "Trending now" },
  { k: "alltime", l: "Most played all-time" },
  { k: "toprated", l: "Top rated (12 mo)" },
];

const Row = ({ g, i, max }) => (
  <Link to={`/game/${g.id}`} data-testid={`chart-row-${g.id}`}
    className="fade-up group grid grid-cols-[3rem_1fr_auto] items-center gap-4 rounded-xl border border-white/5 bg-[#0E1117] p-3 transition-[border-color] hover:border-[#FF9F1C]/40 sm:grid-cols-[4rem_7rem_1fr_auto]"
    style={{ animationDelay: `${i * 30}ms` }}>
    <span className={`font-display text-center text-3xl font-black ${i < 3 ? "text-[#FF9F1C]" : "text-slate-600"}`}>{i + 1}</span>
    <img src={g.background_image} alt="" className="hidden h-16 w-28 rounded-md object-cover sm:block" />
    <div className="min-w-0 space-y-1.5">
      <p className="font-display truncate text-lg font-bold">{g.name}</p>
      <div className="flex flex-wrap items-center gap-3 font-mono text-xs text-slate-500">
        <span className="flex items-center gap-1"><Users className="h-3 w-3" />{(g.added || 0).toLocaleString()}</span>
        {g.rating > 0 && <span className="flex items-center gap-1"><Star className="h-3 w-3 text-[#FF9F1C]" />{g.rating.toFixed(1)}</span>}
        {g.playtime > 0 && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{g.playtime}h avg</span>}
        <span>{fmtDate(g.released)}</span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-white/5">
        <div className="h-full bg-gradient-to-r from-[#FF9F1C] to-[#00F0FF]" style={{ width: `${((g.added || 0) / max) * 100}%` }} />
      </div>
    </div>
    <div className="flex items-center gap-3">
      <div className="hidden md:block"><PlatformTags platforms={g.platforms} max={3} /></div>
      <Metascore score={g.metacritic} />
      <WishButton game={g} />
    </div>
  </Link>
);

export default function Charts() {
  const [kind, setKind] = useState("trending");
  const [platform, setPlatform] = useState("all");
  const { data, loading, error } = useApi("/games/charts", { kind, platform });
  const list = data?.results || [];
  const max = Math.max(1, ...list.map((g) => g.added || 0));

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-12">
      <p className="font-mono text-xs uppercase tracking-[0.25em] text-[#00F0FF]">Leaderboards</p>
      <h1 className="font-display mt-2 text-4xl font-black uppercase tracking-tight sm:text-5xl lg:text-6xl">Top charts</h1>
      <div className="mt-8 flex flex-wrap gap-2">
        {KINDS.map((k) => (
          <button key={k.k} data-testid={`chart-tab-${k.k}`} onClick={() => setKind(k.k)}
            className={`rounded-md px-4 py-2 font-mono text-xs uppercase tracking-widest transition-colors ${kind === k.k ? "bg-[#00F0FF] text-black" : "bg-white/5 text-slate-400 hover:text-white"}`}>
            {k.l}
          </button>
        ))}
      </div>
      <div className="mt-4"><PlatformFilter value={platform} onChange={setPlatform} /></div>
      <div className="mt-8 space-y-3" data-testid="chart-list">
        {loading ? <Skeletons n={8} className="h-24" /> :
          error ? <p className="text-red-400">{error}</p> :
          list.length === 0 ? <p className="text-slate-400" data-testid="chart-empty">No games on this chart yet.</p> :
          list.map((g, i) => <Row key={g.id} g={g} i={i} max={max} />)}
      </div>
    </div>
  );
}
