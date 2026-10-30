import { useState } from "react";
import { ExternalLink, Newspaper } from "lucide-react";
import useApi from "../hooks/useApi";
import Skeletons from "../components/Skeletons";

const PLATS = [
  { k: "all", l: "All platforms" }, { k: "playstation", l: "PlayStation" }, { k: "xbox", l: "Xbox" },
  { k: "nintendo", l: "Nintendo" }, { k: "pc", l: "PC" },
];
const CATS = [
  { k: "all", l: "Everything" }, { k: "announcements", l: "Announcements" },
  { k: "patches", l: "Patches & updates" }, { k: "showcase", l: "Showcases & events" }, { k: "news", l: "General" },
];

const ago = (iso) => {
  if (!iso) return "";
  const h = Math.max(0, Math.round((Date.now() - new Date(iso)) / 3600000));
  return h < 1 ? "just now" : h < 24 ? `${h}h ago` : `${Math.round(h / 24)}d ago`;
};

const Chips = ({ items, value, onChange, prefix, active }) => (
  <div className="no-scrollbar flex gap-2 overflow-x-auto">
    {items.map((x) => (
      <button key={x.k} data-testid={`${prefix}-${x.k}`} onClick={() => onChange(x.k)}
        className={`whitespace-nowrap rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${value === x.k ? active : "border-white/10 text-slate-300 hover:border-white/30"}`}>
        {x.l}
      </button>
    ))}
  </div>
);

const Card = ({ n, big, i }) => (
  <a href={n.link} target="_blank" rel="noreferrer" data-testid={`news-item-${i}`}
    className={`fade-up group flex flex-col overflow-hidden rounded-xl border border-white/10 bg-[#0E1117] transition-[border-color,transform] hover:-translate-y-1 hover:border-[#FF9F1C]/40 ${big ? "md:col-span-2 md:row-span-2" : ""}`}
    style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }}>
    <div className={`relative overflow-hidden bg-slate-900 ${big ? "aspect-[16/9]" : "aspect-[16/9]"}`}>
      {n.image ? <img src={n.image} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" /> :
        <div className="grid h-full place-items-center"><Newspaper className="h-10 w-10 text-slate-700" /></div>}
      <span className="absolute left-3 top-3 rounded bg-black/70 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-[#FF9F1C]">{n.category}</span>
    </div>
    <div className="flex flex-1 flex-col gap-2 p-4">
      <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-slate-500">
        <span className="text-[#00F0FF]">{n.source}</span><span>·</span><span>{ago(n.published)}</span>
      </div>
      <h3 className={`font-display font-bold leading-tight ${big ? "text-2xl sm:text-3xl" : "line-clamp-3 text-lg"}`}>{n.title}</h3>
      {big && <p className="line-clamp-3 text-sm text-slate-400">{n.summary}</p>}
      <span className="mt-auto flex items-center gap-1 pt-2 text-xs font-semibold text-slate-400 group-hover:text-[#FF9F1C]">Read full story <ExternalLink className="h-3 w-3" /></span>
    </div>
  </a>
);

export default function News() {
  const [platform, setPlatform] = useState("all");
  const [category, setCategory] = useState("all");
  const { data, loading, error } = useApi("/news", { platform, category });
  const items = data || [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-12">
      <p className="font-mono text-xs uppercase tracking-[0.25em] text-[#00F0FF]">Live from official blogs & top sites</p>
      <h1 className="font-display mt-2 text-4xl font-black uppercase tracking-tight sm:text-5xl lg:text-6xl">News feed</h1>
      <div className="mt-8 space-y-3">
        <Chips items={PLATS} value={platform} onChange={setPlatform} prefix="news-platform" active="border-[#FF9F1C] bg-[#FF9F1C] text-black" />
        <Chips items={CATS} value={category} onChange={setCategory} prefix="news-category" active="border-[#00F0FF] bg-[#00F0FF] text-black" />
      </div>
      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4" data-testid="news-grid">
        {loading ? <Skeletons n={8} className="aspect-[4/3.4]" /> :
          error ? <p className="text-red-400">{error}</p> :
          items.map((n, i) => <Card key={n.id} n={n} i={i} big={i === 0} />)}
      </div>
      {!loading && !error && items.length === 0 && <p className="mt-6 text-slate-400" data-testid="news-empty">No stories match these filters right now.</p>}
    </div>
  );
}
