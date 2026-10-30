import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Play, ExternalLink, Star, Clock, Users, Bot, Scale } from "lucide-react";
import useApi from "../hooks/useApi";
import { Metascore, WishButton } from "../components/GameCard";
import PriceBox from "../components/PriceBox";
import Reviews from "../components/Reviews";
import { Dialog, DialogContent, DialogTitle } from "../components/ui/dialog";
import { fmtDate } from "../lib/api";

const Stat = ({ icon: Icon, label, value }) => (
  <div className="glass rounded-xl p-4">
    <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-slate-500"><Icon className="h-3 w-3" />{label}</p>
    <p className="font-display mt-1 text-xl font-bold">{value}</p>
  </div>
);

const Info = ({ label, items }) => items?.length ? (
  <div><p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">{label}</p><p className="mt-1 text-sm text-slate-200">{items.join(", ")}</p></div>
) : null;

export default function GameDetail() {
  const { id } = useParams();
  const { data: g, loading, error } = useApi(`/games/${id}`);
  const [media, setMedia] = useState(null);
  const [more, setMore] = useState(false);

  if (loading) return <div className="mx-auto mt-8 h-[60vh] max-w-7xl animate-pulse rounded-2xl bg-slate-800/60" />;
  if (error || !g) return <p className="p-12 text-center text-red-400" data-testid="game-detail-error">{error || "Game not found"}</p>;
  const trailer = g.trailers?.[0];
  const desc = g.description || "";

  return (
    <div data-testid="game-detail-page">
      <section className="relative overflow-hidden">
        <img src={g.background_image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40 blur-sm" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#08090C] via-[#08090C]/70 to-[#08090C]/30" />
        <div className="relative mx-auto grid max-w-7xl gap-8 px-4 pb-12 pt-16 sm:px-6 lg:grid-cols-12 lg:px-12">
          <div className="space-y-5 lg:col-span-7">
            <div className="flex flex-wrap gap-2">{g.genres.map((x) => <span key={x} className="rounded-full border border-[#00F0FF]/40 px-3 py-1 font-mono text-xs uppercase text-[#00F0FF]">{x}</span>)}</div>
            <h1 data-testid="game-detail-title" className="font-display text-4xl font-black uppercase leading-none tracking-tight sm:text-5xl lg:text-6xl">{g.name}</h1>
            <div className="flex flex-wrap items-center gap-3">
              {trailer ? (
                <button data-testid="game-detail-trailer-play-btn" onClick={() => setMedia({ video: trailer.video })}
                  className="flex items-center gap-2 rounded-full bg-[#FF9F1C] px-5 py-2.5 font-bold text-black transition-transform hover:scale-105">
                  <Play className="h-4 w-4 fill-current" /> Watch trailer
                </button>
              ) : (
                <a data-testid="game-detail-trailer-play-btn" target="_blank" rel="noreferrer"
                  href={`https://www.youtube.com/results?search_query=${encodeURIComponent(g.name + " official trailer")}`}
                  className="flex items-center gap-2 rounded-full bg-[#FF9F1C] px-5 py-2.5 font-bold text-black transition-transform hover:scale-105">
                  <Play className="h-4 w-4 fill-current" /> Trailers on YouTube
                </a>
              )}
              <WishButton game={g} className="h-11 w-11" />
              <Link to={`/ai-guide?q=${encodeURIComponent(`Tell me about ${g.name}: is it worth playing and any beginner tips?`)}`} data-testid="game-detail-ask-ai"
                className="flex items-center gap-2 rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold transition-colors hover:border-[#00F0FF] hover:text-[#00F0FF]">
                <Bot className="h-4 w-4" /> Ask Radar AI
              </Link>
              <Link to={`/compare?a=${g.id}`} data-testid="game-detail-compare"
                className="flex items-center gap-2 rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold transition-colors hover:border-[#FF9F1C] hover:text-[#FF9F1C]">
                <Scale className="h-4 w-4" /> Compare
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 self-end lg:col-span-5">
            <Stat icon={Star} label="Rating" value={g.rating ? `${g.rating.toFixed(1)} / 5` : "—"} />
            <div className="glass rounded-xl p-4"><p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">Metascore</p><div className="mt-2">{g.metacritic ? <Metascore score={g.metacritic} className="text-lg" /> : <span className="font-display text-xl font-bold">—</span>}</div></div>
            <Stat icon={Users} label="Players" value={(g.added || 0).toLocaleString()} />
            <Stat icon={Clock} label="Avg playtime" value={g.playtime ? `${g.playtime}h` : "—"} />
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-12 lg:px-12">
        <div className="space-y-10 lg:col-span-8">
          {g.screenshots?.length > 0 && (
            <section>
              <h2 className="font-display mb-4 text-2xl font-extrabold uppercase">Screenshots</h2>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {g.screenshots.slice(0, 9).map((s, i) => (
                  <button key={s} data-testid={`screenshot-${i}`} onClick={() => setMedia({ image: s })} className="overflow-hidden rounded-lg">
                    <img src={s} alt="" loading="lazy" className="aspect-video w-full object-cover transition-transform duration-300 hover:scale-105" />
                  </button>
                ))}
              </div>
            </section>
          )}
          <section>
            <h2 className="font-display mb-4 text-2xl font-extrabold uppercase">About</h2>
            <p data-testid="game-detail-description" className="whitespace-pre-line leading-relaxed text-slate-300">{more ? desc : desc.slice(0, 700)}{desc.length > 700 && !more && "…"}</p>
            {desc.length > 700 && <button data-testid="game-detail-read-more" onClick={() => setMore(!more)} className="mt-2 text-sm font-semibold text-[#FF9F1C]">{more ? "Show less" : "Read more"}</button>}
          </section>
          {g.requirements && (
            <section>
              <h2 className="font-display mb-4 text-2xl font-extrabold uppercase">PC requirements</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {["minimum", "recommended"].filter((k) => g.requirements[k]).map((k) => (
                  <pre key={k} className="glass whitespace-pre-wrap rounded-xl p-4 font-mono text-xs text-slate-300">{g.requirements[k]}</pre>
                ))}
              </div>
            </section>
          )}
          <Reviews gameId={g.id} />
        </div>
        <aside className="space-y-6 lg:col-span-4">
          <PriceBox gameId={g.id} />
          <div className="glass corner space-y-4 rounded-xl p-5">
            <Info label="Released" items={[fmtDate(g.released)]} />
            <Info label="Platforms" items={g.platforms} />
            <Info label="Developer" items={g.developers} />
            <Info label="Publisher" items={g.publishers} />
            <Info label="Age rating" items={g.esrb ? [g.esrb] : []} />
            {g.website && <a href={g.website} target="_blank" rel="noreferrer" data-testid="game-website-link" className="flex items-center gap-1 text-sm text-[#00F0FF] hover:underline">Official website <ExternalLink className="h-3 w-3" /></a>}
          </div>
          {g.stores?.length > 0 && (
            <div className="glass rounded-xl p-5">
              <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-slate-500">Where to buy</p>
              <div className="space-y-2">
                {g.stores.map((s) => (
                  <a key={s.name} href={s.url} target="_blank" rel="noreferrer" data-testid={`store-link-${s.name.toLowerCase().replace(/\s+/g, "-")}`}
                    className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2.5 text-sm font-semibold transition-colors hover:bg-[#FF9F1C] hover:text-black">
                    {s.name} <ExternalLink className="h-4 w-4" />
                  </a>
                ))}
              </div>
            </div>
          )}
          {g.tags?.length > 0 && (
            <div className="flex flex-wrap gap-2">{g.tags.map((t) => <span key={t} className="rounded bg-white/5 px-2 py-1 text-xs text-slate-400">#{t}</span>)}</div>
          )}
        </aside>
      </div>

      <Dialog open={!!media} onOpenChange={(o) => !o && setMedia(null)}>
        <DialogContent className="max-w-5xl border-white/10 bg-black p-2" data-testid="media-dialog">
          <DialogTitle className="sr-only">{g.name} media</DialogTitle>
          {media?.video ? <video src={media.video} controls autoPlay className="w-full rounded" /> :
            media?.image && <img src={media.image} alt="" className="w-full rounded" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
