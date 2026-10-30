import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "../lib/api";

const AuthCtx = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [wishIds, setWishIds] = useState(new Set());

  const loadWishlist = useCallback(async () => {
    try {
      const { data } = await api.get("/wishlist");
      setWishIds(new Set(data.map((w) => w.game_id)));
    } catch {
      setWishIds(new Set());
    }
  }, []);

  const checkAuth = useCallback(async () => {
    try {
      const { data } = await api.get("/auth/me");
      setUser(data);
      loadWishlist();
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [loadWishlist]);

  useEffect(() => {
    // Skip while returning from OAuth; AuthCallback establishes the session first
    if (window.location.hash?.includes("session_id=")) {
      setLoading(false);
      return;
    }
    checkAuth();
  }, [checkAuth]);

  const login = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + "/wishlist";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const logout = async () => {
    await api.post("/auth/logout");
    setUser(null);
    setWishIds(new Set());
    toast("Signed out");
  };

  const toggleWish = async (game) => {
    if (!user) {
      toast("Sign in to build your wishlist", { action: { label: "Sign in", onClick: login } });
      return;
    }
    if (wishIds.has(game.id)) {
      await api.delete(`/wishlist/${game.id}`);
      setWishIds((s) => { const n = new Set(s); n.delete(game.id); return n; });
      toast(`Removed ${game.name} from wishlist`);
    } else {
      await api.post("/wishlist", {
        game_id: game.id, name: game.name, slug: game.slug, background_image: game.background_image,
        released: game.released, rating: game.rating, metacritic: game.metacritic,
        platforms: game.platforms || [], genres: game.genres || [],
      });
      setWishIds((s) => new Set(s).add(game.id));
      toast.success(`${game.name} added to wishlist`);
    }
  };

  return (
    <AuthCtx.Provider value={{ user, setUser, loading, login, logout, wishIds, toggleWish, loadWishlist }}>
      {children}
    </AuthCtx.Provider>
  );
};

export const useAuth = () => useContext(AuthCtx);
