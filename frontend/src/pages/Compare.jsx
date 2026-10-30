import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Trophy } from "lucide-react";
import { api, fmtDate } from "../lib/api";
import GamePicker from "../components/GamePicker";
import { Metascore } from "../components/GameCard";

const useGame = (id) => {
  const [g, setG] = useState(null);
  useEffect(() => {
    if (!id) { setG(null); return; }
    setG({ loading: true });
    Promise.all([api.get(`/games/${id}`), api.get(`/games/${id}/price`), api.get(`/games/${id}/reviews`)])
      .then(([d, p, r]) => setG({ ...d.data, price: p.data, community: r.data }))
      .catch(() => setG(null));
  }, [id]);
  return g;
};

const ROWS = [
  { k: "rating", l: "Player rating", v: (g) => g.rating ? `${g.rating.toFixed(2)} / 5` : "—", n: (g) => g.rating || 0 },
  { k: "metacritic", l: "Metascore", v: (g) => g.metacritic ? <Metascore score={g.metacritic} /> : "—", n: (g) => g.metacritic || 0 },
  { k: "community", l: "GameRadar reviews", v: (g) => g.community?.count ? `${g.community.average} / 5 (${g.community.count})` : "No reviews yet", n: (g) => g.community?.average || 0 },
  { k: "playtime", l: "Avg playtime", v: (g) => g.playtime ? `${g.playtime} hours` : "—", n: (g) => g.playtime || 0 },
  { k: "players", l: "Players", v: (g) => (g.added || 0).toLocaleString(), n: (g) => g.added || 0 },
  { k: "price", l: "Best PC price", v: (g) => g.price?.available ? <a href={g.price.url} target="_blank" rel="noreferrer" className="text-[#00F0FF] hover:underline">${g.price.price.toFixed(2)} · {g.price.store}</a> : "Not on PC deals", n: (g) => g.price?.available ? -g.price.price : -Infinity },
  { k: "released", l: "Released", v: (g) => fmtDate(g.released) },
  { k: "platforms", l: "Platforms", v: (g) => g.platforms.join(", ") || "—" },
  { k: "genres", l: "Genres", v: (g) => g.genres.join(", ") || "—" },
  { k: "developers", l: "Developer", v: (g) => g.developers?.join(", ") || "—" },
  { k: "stores", l: "Where to buy", v: (g) => g.stores?.length ? g.stores.map((s) => <a key={s.name} href={s.url} target="_blank" rel="noreferrer" className="mr-2 inline-block text-[#00F0FF] hover:underline">{s.name}</a>) : "—" },
];

const Cell = ({ row, g, other }) => {
  const ready = g && !g.loading;
  const win = ready && other && !other.loading && row.n && row.n(g) > row.n(other);
  return (
    <td className={`p-4 align-top text-sm ${win ? "bg-[#FF9F1C]/10" : ""}`} data-testid={`compare-cell-${row.k}`}>
      {!g ? <span className="text-slate-600">—</span> : g.loading ? <div className="h-4 w-24 animate-pulse rounded bg-slate-800" /> :
        <span className="flex items-start gap-2">{win && <Trophy className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#FF9F1C]" />}<span>{row.v(g)}</span></span>}
    </td>
  );
};

const Head = ({ g }) => g && !g.loading ? (
  <Link to={`/game/${g.id}`} className="block overflow-hidden rounded-xl border border-white/10" data-testid={`compare-head-${g.id}`}>
    <img src={g.background_image} alt="" className="aspect-video w-full object-cover" />
    <p className="font-display truncate p-3 text-lg font-bold">{g.name}</p>
  </Link>
) : <div className="aspect-[16/10.5] rounded-xl border border-dashed border-white/10" />;

export default function Compare() {
  const [params, setParams] = useSearchParams();
  const a = params.get("a");
  const b = params.get("b");
  const ga = useGame(a);
  const gb = useGame(b);
  const set = (k, v) => { const p = new URLSearchParams(params); v ? p.set(k, v) : p.delete(k); setParams(p, { replace: true }); };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-12">
      <p className="font-mono text-xs uppercase tracking-[0.25em] text-[#00F0FF]">Head to head</p>
      <h1 className="font-display mt-2 text-4xl font-black uppercase tracking-tight sm:text-5xl lg:text-6xl">Compare games</h1>
      <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-6">
        <GamePicker slot="a" selected={ga && !ga.loading ? ga : null} onPick={(id) => set("a", id)} onClear={() => set("a", null)} />
        <GamePicker slot="b" selected={gb && !gb.loading ? gb : null} onPick={(id) => set("b", id)} onClear={() => set("b", null)} />
      </div>
      <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full min-w-[560px] table-fixed" data-testid="compare-table">
          <thead>
            <tr className="bg-[#0E1117]">
              <th className="w-36 p-4" />
              <th className="p-4"><Head g={ga} /></th>
              <th className="p-4"><Head g={gb} /></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {ROWS.map((r) => (
              <tr key={r.k}>
                <th className="p-4 text-left align-top font-mono text-[10px] font-normal uppercase tracking-widest text-slate-500">{r.l}</th>
                <Cell row={r} g={ga} other={gb} />
                <Cell row={r} g={gb} other={ga} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-slate-500">PC prices via CheapShark; console store prices aren't publicly available — use the store links.</p>
    </div>
  );
}
