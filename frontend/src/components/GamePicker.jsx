import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { api } from "../lib/api";

export default function GamePicker({ slot, onPick, onClear, selected }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const timer = useRef(null);

  useEffect(() => {
    clearTimeout(timer.current);
    if (q.trim().length < 2) { setResults([]); return; }
    timer.current = setTimeout(() => {
      api.get("/games", { params: { search: q, page_size: 6 } }).then(({ data }) => setResults(data.results));
    }, 350);
  }, [q]);

  if (selected)
    return (
      <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#0E1117] p-2" data-testid={`compare-selected-${slot}`}>
        {selected.background_image && <img src={selected.background_image} alt="" className="h-10 w-16 rounded object-cover" />}
        <span className="font-display flex-1 truncate font-bold">{selected.name}</span>
        <button data-testid={`compare-clear-${slot}`} onClick={onClear} className="p-2 text-slate-400 hover:text-white"><X className="h-4 w-4" /></button>
      </div>
    );

  return (
    <div className="relative">
      <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#0E1117] px-3 py-3">
        <Search className="h-4 w-4 text-slate-500" />
        <input data-testid={`compare-search-${slot}`} value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Pick game ${slot.toUpperCase()}…`}
          className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500" />
      </div>
      {results.length > 0 && (
        <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-white/10 bg-[#141824] shadow-2xl">
          {results.map((g) => (
            <button key={g.id} data-testid={`compare-result-${slot}-${g.id}`} onClick={() => { onPick(g.id); setQ(""); setResults([]); }}
              className="flex w-full items-center gap-3 p-2 text-left transition-colors hover:bg-white/5">
              {g.background_image && <img src={g.background_image} alt="" className="h-9 w-14 rounded object-cover" />}
              <span className="truncate text-sm">{g.name}</span>
              <span className="ml-auto font-mono text-xs text-slate-500">{g.released?.slice(0, 4)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
