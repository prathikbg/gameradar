import { Link } from "react-router-dom";
import { Heart, Star } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { fmtDate, platformShort } from "../lib/api";

export const Metascore = ({ score, className = "" }) => {
  if (!score) return null;
  const c = score >= 75 ? "border-emerald-500 text-emerald-400" : score >= 50 ? "border-amber-500 text-amber-400" : "border-red-500 text-red-400";
  return <span className={`rounded border px-1.5 py-0.5 font-mono text-xs font-bold ${c} ${className}`}>{score}</span>;
};

export const PlatformTags = ({ platforms = [], max = 4 }) => {
  const tags = [...new Set(platforms.map(platformShort).filter(Boolean))].slice(0, max);
  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((t) => (
        <span key={t} className="rounded-sm bg-white/5 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-slate-400">{t}</span>
      ))}
    </div>
  );
};

export const WishButton = ({ game, className = "" }) => {
  const { wishIds, toggleWish } = useAuth();
  const on = wishIds.has(game.id);
  return (
    <button data-testid={`wishlist-toggle-btn-${game.id}`}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleWish(game); }}
      className={`grid h-9 w-9 place-items-center rounded-full backdrop-blur-md transition-all hover:scale-110 ${on ? "bg-[#FF3860] text-white" : "bg-black/50 text-white hover:bg-black/70"} ${className}`}>
      <Heart className={`h-4 w-4 ${on ? "fill-current" : ""}`} />
    </button>
  );
};

export default function GameCard({ game, index = 0 }) {
  return (
    <Link to={`/game/${game.id}`} data-testid={`game-card-${game.id}`}
      className="group fade-up block overflow-hidden rounded-xl border border-white/10 bg-[#0E1117] transition-[border-color,transform] duration-300 hover:-translate-y-1 hover:border-[#FF9F1C]/40"
      style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}>
      <div className="relative aspect-[16/10] overflow-hidden bg-slate-900">
        {game.background_image && (
          <img src={game.background_image} alt={game.name} loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0E1117] via-transparent to-transparent" />
        <WishButton game={game} className="absolute right-3 top-3" />
        <Metascore score={game.metacritic} className="absolute bottom-3 right-3 bg-black/60" />
      </div>
      <div className="space-y-2 p-4">
        <PlatformTags platforms={game.platforms} />
        <h3 className="font-display line-clamp-1 text-lg font-bold leading-tight">{game.name}</h3>
        <div className="flex items-center justify-between font-mono text-xs text-slate-500">
          <span>{fmtDate(game.released)}</span>
          {game.rating > 0 && <span className="flex items-center gap-1 text-slate-300"><Star className="h-3 w-3 fill-[#FF9F1C] text-[#FF9F1C]" />{game.rating.toFixed(1)}</span>}
        </div>
      </div>
    </Link>
  );
}

export const CardSkeletons = ({ n = 8 }) => (
  <>{Array.from({ length: n }).map((_, i) => <div key={i} className="aspect-[4/3.6] animate-pulse rounded-xl bg-slate-800/60" />)}</>
);
