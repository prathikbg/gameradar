import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Cookie } from "lucide-react";

const KEY = "gr_consent";
const EVENT = "gr-open-cookie-settings";

export const openCookieSettings = () => window.dispatchEvent(new Event(EVENT));

const inEurope = () => {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone.startsWith("Europe/"); } catch { return false; }
};

const apply = (choice) => {
  localStorage.setItem(KEY, choice);
  if (typeof window.gtag === "function") {
    window.gtag("consent", "update", { ad_storage: choice, ad_user_data: choice, ad_personalization: choice, analytics_storage: choice });
  }
  (window.adsbygoogle = window.adsbygoogle || []).requestNonPersonalizedAds = choice === "denied" ? 1 : 0;
};

export default function CookieConsent() {
  const [open, setOpen] = useState(() => !localStorage.getItem(KEY) && inEurope());

  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener(EVENT, show);
    return () => window.removeEventListener(EVENT, show);
  }, []);

  if (!open) return null;
  const choose = (c) => { apply(c); setOpen(false); };

  return (
    <div className="fixed inset-x-3 bottom-3 z-[90] sm:inset-x-auto sm:left-6 sm:max-w-md" data-testid="cookie-consent-banner">
      <div className="glass corner rounded-2xl p-5 shadow-2xl">
        <div className="flex items-center gap-2">
          <Cookie className="h-5 w-5 text-[#FF9F1C]" />
          <p className="font-display font-bold">Cookies & ads</p>
        </div>
        <p className="mt-2 text-sm text-slate-300">
          We use cookies to keep you signed in and, with your consent, to show personalised ads through Google AdSense.
          Decline and you'll still see ads, just not personalised ones. <Link to="/privacy" className="text-[#00F0FF] hover:underline" data-testid="cookie-privacy-link">Privacy policy</Link>
        </p>
        <div className="mt-4 flex gap-2">
          <button data-testid="cookie-accept-btn" onClick={() => choose("granted")} className="flex-1 rounded-full bg-[#FF9F1C] px-4 py-2 text-sm font-bold text-black transition-transform hover:scale-105">Accept all</button>
          <button data-testid="cookie-decline-btn" onClick={() => choose("denied")} className="flex-1 rounded-full border border-white/20 px-4 py-2 text-sm font-semibold transition-colors hover:border-white/40">Decline</button>
        </div>
      </div>
    </div>
  );
}
