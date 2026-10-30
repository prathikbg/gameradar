import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function AuthCallback() {
  const navigate = useNavigate();
  const { setUser, loadWishlist } = useAuth();
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    const sid = new URLSearchParams(window.location.hash.slice(1)).get("session_id");
    api.post("/auth/session", { session_id: sid })
      .then(({ data }) => {
        setUser(data);
        loadWishlist();
        window.history.replaceState(null, "", window.location.pathname);
        navigate("/wishlist", { replace: true });
      })
      .catch(() => navigate("/", { replace: true }));
  }, [navigate, setUser, loadWishlist]);

  return <div className="min-h-screen" />;
}
