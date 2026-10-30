import { useState } from "react";
import { useParams } from "react-router-dom";
import useApi from "../hooks/useApi";
import Reviews from "../components/Reviews";
import GameHero from "../components/game/GameHero";
import GameSidebar from "../components/game/GameSidebar";
import { About, Requirements, Screenshots } from "../components/game/GameSections";
import { Dialog, DialogContent, DialogTitle } from "../components/ui/dialog";

const MediaDialog = ({ media, title, onClose }) => (
  <Dialog open={!!media} onOpenChange={(o) => !o && onClose()}>
    <DialogContent className="max-w-5xl border-white/10 bg-black p-2" data-testid="media-dialog">
      <DialogTitle className="sr-only">{title} media</DialogTitle>
      {media?.video ? <video src={media.video} controls autoPlay className="w-full rounded" /> :
        media?.image && <img src={media.image} alt="" className="w-full rounded" />}
    </DialogContent>
  </Dialog>
);

export default function GameDetail() {
  const { id } = useParams();
  const { data: g, loading, error } = useApi(`/games/${id}`);
  const [media, setMedia] = useState(null);

  if (loading) return <div className="mx-auto mt-8 h-[60vh] max-w-7xl animate-pulse rounded-2xl bg-slate-800/60" />;
  if (error || !g) return <p className="p-12 text-center text-red-400" data-testid="game-detail-error">{error || "Game not found"}</p>;

  return (
    <div data-testid="game-detail-page">
      <GameHero g={g} onPlay={(video) => setMedia({ video })} />
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-12 lg:px-12">
        <div className="space-y-10 lg:col-span-8">
          <Screenshots shots={g.screenshots} onOpen={(image) => setMedia({ image })} />
          <About description={g.description} />
          <Requirements requirements={g.requirements} />
          <Reviews gameId={g.id} />
        </div>
        <GameSidebar g={g} />
      </div>
      <MediaDialog media={media} title={g.name} onClose={() => setMedia(null)} />
    </div>
  );
}
