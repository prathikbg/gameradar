import { useCallback, useEffect, useState } from "react";
import { Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";

const Stars = ({ value, onChange, size = "h-5 w-5" }) => (
  <div className="flex gap-1">
    {[1, 2, 3, 4, 5].map((n) => (
      <button key={n} type="button" disabled={!onChange} data-testid={onChange ? `review-star-${n}` : undefined} onClick={() => onChange?.(n)}>
        <Star className={`${size} ${n <= value ? "fill-[#FF9F1C] text-[#FF9F1C]" : "text-slate-600"}`} />
      </button>
    ))}
  </div>
);

const Form = ({ gameId, mine, onSaved }) => {
  const [rating, setRating] = useState(mine?.rating || 0);
  const [text, setText] = useState(mine?.text || "");
  const [saving, setSaving] = useState(false);
  useEffect(() => { setRating(mine?.rating || 0); setText(mine?.text || ""); }, [mine]);

  const submit = async (e) => {
    e.preventDefault();
    if (!rating || text.trim().length < 3) { toast.error("Pick a star rating and write a few words"); return; }
    setSaving(true);
    try {
      await api.post(`/games/${gameId}/reviews`, { rating, text });
      toast.success(mine ? "Review updated" : "Review posted");
      onSaved();
    } catch {
      toast.error("Couldn't save your review. Please try again.");
    } finally { setSaving(false); }
  };
  const remove = async () => {
    try { await api.delete(`/games/${gameId}/reviews`); toast("Review deleted"); onSaved(); }
    catch { toast.error("Couldn't delete your review."); }
  };

  return (
    <form onSubmit={submit} className="glass space-y-3 rounded-xl p-5" data-testid="review-form">
      <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">{mine ? "Your review" : "Rate this game"}</p>
      <Stars value={rating} onChange={setRating} size="h-7 w-7" />
      <textarea data-testid="review-text-input" value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} rows={3}
        placeholder="What did you think? Gameplay, story, performance…"
        className="w-full rounded-lg border border-white/10 bg-black/30 p-3 text-sm outline-none focus:border-[#FF9F1C]/50" />
      <div className="flex gap-2">
        <button data-testid="review-submit-btn" disabled={saving} className="rounded-full bg-[#FF9F1C] px-5 py-2 text-sm font-bold text-black transition-transform hover:scale-105 disabled:opacity-50">
          {mine ? "Update review" : "Post review"}
        </button>
        {mine && <button type="button" data-testid="review-delete-btn" onClick={remove} className="flex items-center gap-1 rounded-full px-4 py-2 text-sm text-slate-400 hover:text-[#FF3860]"><Trash2 className="h-4 w-4" />Delete</button>}
      </div>
    </form>
  );
};

export default function Reviews({ gameId }) {
  const { user, login } = useAuth();
  const [data, setData] = useState(null);
  const load = useCallback(() => api.get(`/games/${gameId}/reviews`).then(({ data }) => setData(data)), [gameId]);
  useEffect(() => { load(); }, [load]);
  const mine = data?.reviews.find((r) => r.user_id === user?.user_id);

  return (
    <section data-testid="reviews-section">
      <div className="mb-4 flex items-end justify-between">
        <h2 className="font-display text-2xl font-extrabold uppercase">Player reviews</h2>
        {data?.count > 0 && (
          <div className="flex items-center gap-2" data-testid="reviews-summary">
            <span className="font-display text-2xl font-black text-[#FF9F1C]">{data.average.toFixed(1)}</span>
            <span className="font-mono text-xs text-slate-500">/ 5 · {data.count} {data.count === 1 ? "review" : "reviews"}</span>
          </div>
        )}
      </div>
      {user ? <Form gameId={gameId} mine={mine} onSaved={load} /> : (
        <div className="glass flex flex-wrap items-center justify-between gap-3 rounded-xl p-5">
          <p className="text-sm text-slate-400">Sign in to rate and review this game.</p>
          <button data-testid="review-login-btn" onClick={login} className="rounded-full bg-[#FF9F1C] px-5 py-2 text-sm font-bold text-black">Sign in</button>
        </div>
      )}
      <div className="mt-5 space-y-3" data-testid="reviews-list">
        {data?.reviews.map((r) => (
          <div key={r.review_id} className="rounded-xl border border-white/5 bg-[#0E1117] p-4" data-testid={`review-${r.review_id}`}>
            <div className="flex items-center gap-3">
              {r.user_picture ? <img src={r.user_picture} alt="" className="h-8 w-8 rounded-full object-cover" /> :
                <span className="grid h-8 w-8 place-items-center rounded-full bg-slate-800 text-sm font-bold">{r.user_name?.[0]}</span>}
              <div className="flex-1">
                <p className="text-sm font-semibold">{r.user_name}</p>
                <p className="font-mono text-[10px] text-slate-500">{new Date(r.updated_at).toLocaleDateString()}</p>
              </div>
              <Stars value={r.rating} size="h-4 w-4" />
            </div>
            <p className="mt-3 whitespace-pre-line text-sm text-slate-300">{r.text}</p>
          </div>
        ))}
        {data && data.count === 0 && <p className="text-sm text-slate-500" data-testid="reviews-empty">No reviews yet — be the first.</p>}
      </div>
    </section>
  );
}
