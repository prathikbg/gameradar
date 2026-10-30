import { Link } from "react-router-dom";
import { Play, Star, Clock, Users, Bot, Scale } from "lucide-react";
import { Metascore, WishButton } from "../GameCard";

const Stat = ({ icon: Icon, label, value }) => (
  <div className="glass rounded-xl p-4">
    <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-slate-500">{Icon && <Icon className="h-3 w-3" />}{label}</p>
    <div className="font-display mt-1 text-xl font-bold">{value}</div>
  </div>
);

const pill = "flex items-center gap-2 rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold transition-colors";
const primary = "flex items-center gap-2 rounded-full bg-[#FF9F1C] px-5 py-2.5 font-bold text-black transition-transform hover:scale-105";

const TrailerButton = ({ g, onPlay }) => {
  const trailer = g.trailers?.[0];
  if (trailer)
    return <button data-testid="game-detail-trailer-play-btn" onClick={() => onPlay(trailer.video)} className={primary}><Play className="h-4 w-4 fill-current" /> Watch trailer</button>;
  return (
    <a data-testid="game-detail-trailer-play-btn" target="_blank" rel="noreferrer" className={primary}
      href={`https://www.youtube.com/results?search_query=${encodeURIComponent(g.name + " official trailer")}`}>
      <Play className="h-4 w-4 fill-current" /> Trailers on YouTube
    </a>
  );
};

const Actions = ({ g, onPlay }) => (
  <div className="flex flex-wrap items-center gap-3">
    <TrailerButton g={g} onPlay={onPlay} />
    <WishButton game={g} className="h-11 w-11" />
    <Link to={`/ai-guide?q=${encodeURIComponent(`Tell me about ${g.name}: is it worth playing and any beginner tips?`)}`} data-testid="game-detail-ask-ai"
      className={`${pill} hover:border-[#00F0FF] hover:text-[#00F0FF]`}><Bot className="h-4 w-4" /> Ask Radar AI</Link>
    <Link to={`/compare?a=${g.id}`} data-testid="game-detail-compare"
      className={`${pill} hover:border-[#FF9F1C] hover:text-[#FF9F1C]`}><Scale className="h-4 w-4" /> Compare</Link>
  </div>
);

const Stats = ({ g }) => (
  <div className="grid grid-cols-2 gap-3 self-end lg:col-span-5">
    <Stat icon={Star} label="Rating" value={g.rating ? `${g.rating.toFixed(1)} / 5` : "—"} />
    <Stat label="Metascore" value={g.metacritic ? <Metascore score={g.metacritic} className="text-lg" /> : "—"} />
    <Stat icon={Users} label="Players" value={(g.added || 0).toLocaleString()} />
    <Stat icon={Clock} label="Avg playtime" value={g.playtime ? `${g.playtime}h` : "—"} />
  </div>
);

export default function GameHero({ g, onPlay }) {
  return (
    <section className="relative overflow-hidden">
      <img src={g.background_image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40 blur-sm" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#08090C] via-[#08090C]/70 to-[#08090C]/30" />
      <div className="relative mx-auto grid max-w-7xl gap-8 px-4 pb-12 pt-16 sm:px-6 lg:grid-cols-12 lg:px-12">
        <div className="space-y-5 lg:col-span-7">
          <div className="flex flex-wrap gap-2">{g.genres.map((x) => <span key={x} className="rounded-full border border-[#00F0FF]/40 px-3 py-1 font-mono text-xs uppercase text-[#00F0FF]">{x}</span>)}</div>
          <h1 data-testid="game-detail-title" className="font-display text-4xl font-black uppercase leading-none tracking-tight sm:text-5xl lg:text-6xl">{g.name}</h1>
          <Actions g={g} onPlay={onPlay} />
        </div>
        <Stats g={g} />
      </div>
    </section>
  );
}
