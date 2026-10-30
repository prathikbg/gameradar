import { useState } from "react";
import { Link } from "react-router-dom";
import { Bot, Flame, CalendarDays, Star } from "lucide-react";
import useApi from "../hooks/useApi";
import GameCard, { CardSkeletons, Metascore, PlatformTags, WishButton } from "../components/GameCard";
import PlatformFilter from "../components/PlatformFilter";
import SectionHead from "../components/SectionHead";
import { fmtDate } from "../lib/api";

const Hero = ({ game }) => (
  <Link to={`/game/${game.id}`} data-testid="home-hero-card" className="corner group relative block min-h-[420px] overflow-hidden rounded-2xl border border-white/10 lg:col-span-8">
    <img src={game.background_image} alt={game.name} className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
    <div className="scanlines absolute inset-0 opacity-40" />
    <div className="absolute inset-0 bg-gradient-to-t from-[#08090C] via-[#08090C]/50 to-transparent" />
    <WishButton game={game} className="absolute right-5 top-5" />
    <div className="absolute bottom-0 left-0 max-w-2xl space-y-4 p-6 sm:p-10">
      <span className="inline-flex items-center gap-2 rounded-full bg-[#FF3860] px-3 py-1 font-mono text-xs font-bold uppercase tracking-widest">
        <Flame className="h-3 w-3" /> #1 Trending now
      </span>
      <h1 className="font-display text-4xl font-black uppercase leading-none tracking-tight sm:text-5xl lg:text-6xl">{game.name}</h1>
      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
        <Metascore score={game.metacritic} />
        <span className="font-mono">{fmtDate(game.released)}</span>
        <PlatformTags platforms={game.platforms} max={6} />
      </div>
    </div>
  </Link>
);

const TrendingList = ({ games }) => (
  <div className="glass rounded-2xl p-5 lg:col-span-4" data-testid="home-trending-list">
    <p className="mb-4 font-mono text-xs uppercase tracking-[0.25em] text-[#FF9F1C]">Most played · Top 6</p>
    <ol className="space-y-2">
      {games.map((g, i) => (
        <li key={g.id}>
          <Link to={`/game/${g.id}`} data-testid={`home-trending-item-${g.id}`} className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-white/5">
            <span className="font-display w-7 text-2xl font-black text-slate-600">{String(i + 1).padStart(2, "0")}</span>
            <img src={g.background_image} alt="" className="h-11 w-16 rounded object-cover" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{g.name}</p>
              <p className="font-mono text-xs text-slate-500">{(g.added || 0).toLocaleString()} players</p>
            </div>
          </Link>
        </li>
      ))}
    </ol>
  </div>
);

const QuickTiles = () => (
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
    {[
      { to: "/calendar", icon: CalendarDays, t: "Release calendar", d: "Every upcoming drop, month by month", c: "#00F0FF", id: "tile-calendar" },
      { to: "/charts", icon: Star, t: "Top charts", d: "Trending, all-time & critic favourites", c: "#FF9F1C", id: "tile-charts" },
      { to: "/ai-guide", icon: Bot, t: "Ask Radar AI", d: "Recommendations, tips & boss guides", c: "#FF3860", id: "tile-ai" },
    ].map(({ to, icon: Icon, t, d, c, id }) => (
      <Link key={to} to={to} data-testid={id} className="group rounded-2xl border border-white/10 bg-[#0E1117] p-6 transition-[border-color] hover:border-white/30">
        <Icon className="h-6 w-6" style={{ color: c }} />
        <h3 className="font-display mt-4 text-xl font-bold">{t}</h3>
        <p className="mt-1 text-sm text-slate-400">{d}</p>
      </Link>
    ))}
  </div>
);

export default function Home() {
  const [platform, setPlatform] = useState("all");
  const trending = useApi("/games/charts", { kind: "trending" });
  const fresh = useApi("/games/new", { platform });
  const up = useApi("/games/upcoming");
  const t = trending.data?.results || [];

  return (
    <div className="mx-auto max-w-7xl space-y-16 px-4 py-8 sm:px-6 lg:space-y-24 lg:px-12">
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {trending.loading ? <div className="h-[420px] animate-pulse rounded-2xl bg-slate-800/60 lg:col-span-12" /> :
          trending.error ? <p data-testid="home-error" className="text-red-400 lg:col-span-12">{trending.error}</p> :
          t[0] && (<><Hero game={t[0]} /><TrendingList games={t.slice(1, 7)} /></>)}
      </section>

      <section>
        <SectionHead kicker="Fresh drops · last 90 days" title="New releases" to="/releases" testId="home-releases-viewall" />
        <div className="mb-6"><PlatformFilter value={platform} onChange={setPlatform} /></div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {fresh.loading ? <CardSkeletons /> : (fresh.data?.results || []).slice(0, 8).map((g, i) => <GameCard key={g.id} game={g} index={i} />)}
        </div>
      </section>

      <QuickTiles />

      <section>
        <SectionHead kicker="On the horizon" title="Coming soon" to="/calendar" testId="home-upcoming-viewall" />
        <div className="no-scrollbar -mx-4 flex gap-5 overflow-x-auto px-4 pb-2">
          {(up.data?.results || []).slice(0, 10).map((g, i) => (
            <div key={g.id} className="w-72 shrink-0"><GameCard game={g} index={i} /></div>
          ))}
        </div>
      </section>
    </div>
  );
}
