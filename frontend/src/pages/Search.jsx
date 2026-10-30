import { useSearchParams } from "react-router-dom";
import useApi from "../hooks/useApi";
import GameCard, { CardSkeletons } from "../components/GameCard";

export default function Search() {
  const [params] = useSearchParams();
  const q = params.get("q") || "";
  const { data, loading, error } = useApi("/games", { search: q, page_size: 24 });

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-12">
      <p className="font-mono text-xs uppercase tracking-[0.25em] text-[#00F0FF]">Search results</p>
      <h1 data-testid="search-title" className="font-display mt-2 text-4xl font-black uppercase tracking-tight sm:text-5xl">“{q}”</h1>
      <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4" data-testid="search-results">
        {loading ? <CardSkeletons /> : error ? <p className="text-red-400">{error}</p> :
          (data?.results || []).map((g, i) => <GameCard key={g.id} game={g} index={i} />)}
      </div>
      {!loading && data?.results?.length === 0 && <p className="text-slate-400" data-testid="search-empty">No games match your search.</p>}
    </div>
  );
}
