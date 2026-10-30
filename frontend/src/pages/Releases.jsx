import { useEffect, useState } from "react";
import { api } from "../lib/api";
import GameCard, { CardSkeletons } from "../components/GameCard";
import PlatformFilter from "../components/PlatformFilter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";

const SORTS = [
  { v: "-added", l: "Most popular" },
  { v: "-released", l: "Newest first" },
  { v: "-rating", l: "Top rated" },
  { v: "-metacritic", l: "Metascore" },
];

export default function Releases() {
  const [platform, setPlatform] = useState("all");
  const [ordering, setOrdering] = useState("-added");
  const [games, setGames] = useState([]);
  const [pageNum, setPageNum] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get("/games/new", { params: { platform, ordering, page_num: pageNum } })
      .then(({ data }) => { setGames((g) => (pageNum === 1 ? data.results : [...g, ...data.results])); setHasMore(data.next); })
      .finally(() => setLoading(false));
  }, [platform, ordering, pageNum]);

  const change = (fn) => (v) => { setPageNum(1); setGames([]); fn(v); };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-12">
      <p className="font-mono text-xs uppercase tracking-[0.25em] text-[#00F0FF]">Last 90 days</p>
      <h1 className="font-display mt-2 text-4xl font-black uppercase tracking-tight sm:text-5xl lg:text-6xl">New releases</h1>
      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PlatformFilter value={platform} onChange={change(setPlatform)} />
        <Select value={ordering} onValueChange={change(setOrdering)}>
          <SelectTrigger data-testid="releases-sort-select" className="w-48 border-white/10 bg-[#0E1117]"><SelectValue /></SelectTrigger>
          <SelectContent className="border-white/10 bg-[#141824] text-slate-200">
            {SORTS.map((s) => <SelectItem key={s.v} value={s.v} data-testid={`sort-option-${s.v}`}>{s.l}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4" data-testid="releases-grid">
        {games.map((g, i) => <GameCard key={g.id} game={g} index={i % 24} />)}
        {loading && <CardSkeletons />}
      </div>
      {!loading && games.length === 0 && <p className="mt-10 text-slate-400" data-testid="releases-empty">No games found.</p>}
      {hasMore && !loading && (
        <div className="mt-10 text-center">
          <button data-testid="releases-load-more" onClick={() => setPageNum((p) => p + 1)}
            className="rounded-full border border-[#FF9F1C]/50 px-6 py-2.5 font-semibold text-[#FF9F1C] transition-colors hover:bg-[#FF9F1C] hover:text-black">
            Load more
          </button>
        </div>
      )}
    </div>
  );
}
