import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import GameCard, { CardSkeletons } from "../components/GameCard";

export default function Wishlist() {
  const { user, loading, login, wishIds } = useAuth();
  const [items, setItems] = useState(null);

  useEffect(() => {
    if (user) api.get("/wishlist").then(({ data }) => setItems(data));
  }, [user]);

  if (loading) return null;
  if (!user)
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center" data-testid="wishlist-signed-out">
        <Heart className="mx-auto h-10 w-10 text-[#FF3860]" />
        <h1 className="font-display mt-6 text-4xl font-black uppercase">Your wishlist</h1>
        <p className="mt-3 text-slate-400">Sign in to save games you want to play and track their release dates.</p>
        <button data-testid="wishlist-login-button" onClick={login}
          className="mt-8 rounded-full bg-[#FF9F1C] px-6 py-3 font-bold text-black transition-transform hover:scale-105">
          Sign in with Google
        </button>
      </div>
    );

  const list = (items || []).filter((w) => wishIds.has(w.game_id)).map((w) => ({ ...w, id: w.game_id }));
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-12">
      <p className="font-mono text-xs uppercase tracking-[0.25em] text-[#00F0FF]">Hey {user.name?.split(" ")[0]}</p>
      <h1 className="font-display mt-2 text-4xl font-black uppercase tracking-tight sm:text-5xl lg:text-6xl">Wishlist <span className="text-slate-600">{list.length}</span></h1>
      <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4" data-testid="wishlist-grid">
        {!items ? <CardSkeletons n={4} /> : list.map((g, i) => <GameCard key={g.id} game={g} index={i} />)}
      </div>
      {items && list.length === 0 && <p className="mt-6 text-slate-400" data-testid="wishlist-empty">No games yet — tap the heart on any game to save it.</p>}
    </div>
  );
}
