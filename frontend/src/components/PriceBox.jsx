import { Tag, ExternalLink } from "lucide-react";
import useApi from "../hooks/useApi";

export default function PriceBox({ gameId }) {
  const { data: p, loading } = useApi(`/games/${gameId}/price`);
  if (loading) return <div className="h-28 animate-pulse rounded-xl bg-slate-800/60" />;
  return (
    <div className="glass rounded-xl p-5" data-testid="price-box">
      <p className="mb-3 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-slate-500"><Tag className="h-3 w-3" />Best PC price</p>
      {!p?.available ? (
        <p className="text-sm text-slate-400" data-testid="price-unavailable">No PC deals found — check the store links below.</p>
      ) : (
        <>
          <div className="flex items-end gap-3">
            <span className="font-display text-4xl font-black text-[#00F0FF]" data-testid="price-best">${p.price.toFixed(2)}</span>
            {p.savings > 0 && <span className="mb-1 text-sm text-slate-500 line-through">${p.retail.toFixed(2)}</span>}
            {p.savings > 0 && <span className="mb-1 rounded bg-[#10B981]/20 px-1.5 py-0.5 font-mono text-xs font-bold text-emerald-400">-{p.savings}%</span>}
          </div>
          <p className="mt-1 text-xs text-slate-500">at {p.store}{p.cheapest_ever ? ` · lowest ever $${p.cheapest_ever.toFixed(2)}` : ""}</p>
          <div className="mt-3 space-y-1.5">
            {p.deals.map((d, i) => (
              <a key={i} href={d.url} target="_blank" rel="noreferrer" data-testid={`price-deal-${i}`}
                className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-sm transition-colors hover:bg-white/10">
                <span>{d.store}</span><span className="flex items-center gap-2 font-mono">${d.price.toFixed(2)}<ExternalLink className="h-3 w-3" /></span>
              </a>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
