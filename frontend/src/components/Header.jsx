import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Radar, Search, Bot, Menu, X, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";

const LINKS = [
  { label: "Home", to: "/", id: "home" },
  { label: "New Releases", to: "/releases", id: "releases" },
  { label: "Charts", to: "/charts", id: "charts" },
  { label: "Calendar", to: "/calendar", id: "calendar" },
  { label: "AI Guide", to: "/ai-guide", id: "ai-guide" },
  { label: "Wishlist", to: "/wishlist", id: "wishlist" },
];

const UserArea = () => {
  const { user, login, logout } = useAuth();
  if (!user)
    return (
      <button data-testid="google-login-button" onClick={login}
        className="rounded-full bg-[#FF9F1C] px-4 py-2 text-sm font-bold text-black transition-transform hover:scale-105 active:scale-95">
        Sign in
      </button>
    );
  return (
    <DropdownMenu>
      <DropdownMenuTrigger data-testid="user-avatar-button" className="h-9 w-9 overflow-hidden rounded-full ring-2 ring-[#FF9F1C]/60">
        {user.picture ? <img src={user.picture} alt={user.name} className="h-full w-full object-cover" /> :
          <span className="grid h-full w-full place-items-center bg-slate-800 text-sm font-bold">{user.name?.[0]}</span>}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="border-white/10 bg-[#141824] text-slate-200">
        <div className="px-2 py-1.5 text-xs text-slate-400">{user.email}</div>
        <DropdownMenuItem data-testid="logout-button" onClick={logout}><LogOut className="mr-2 h-4 w-4" />Sign out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default function Header() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const submit = (e) => {
    e.preventDefault();
    if (q.trim()) navigate(`/search?q=${encodeURIComponent(q.trim())}`);
    setOpen(false);
  };
  const linkCls = ({ isActive }) =>
    `px-3 py-2 text-sm font-semibold transition-colors ${isActive ? "text-[#FF9F1C]" : "text-slate-400 hover:text-white"}`;

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#08090C]/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6 lg:px-12">
        <Link to="/" data-testid="nav-brand-logo" className="flex items-center gap-2">
          <Radar className="h-6 w-6 text-[#FF9F1C]" />
          <span className="font-display text-xl font-black uppercase tracking-tight">Game<span className="text-[#00F0FF]">Radar</span></span>
        </Link>
        <nav className="ml-4 hidden items-center lg:flex">
          {LINKS.map((l) => (
            <NavLink key={l.id} to={l.to} end={l.to === "/"} data-testid={`nav-link-${l.id}`} className={linkCls}>{l.label}</NavLink>
          ))}
        </nav>
        <form onSubmit={submit} className="ml-auto hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 md:flex">
          <Search className="h-4 w-4 text-slate-500" />
          <input data-testid="global-search-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search games..."
            className="w-40 bg-transparent text-sm outline-none placeholder:text-slate-500 xl:w-56" />
        </form>
        <Link to="/ai-guide" data-testid="header-ai-button" className="hidden h-9 w-9 place-items-center rounded-full border border-[#00F0FF]/40 text-[#00F0FF] transition-colors hover:bg-[#00F0FF]/10 sm:grid md:ml-0 ml-auto">
          <Bot className="h-4 w-4" />
        </Link>
        <UserArea />
        <button data-testid="mobile-menu-toggle" className="lg:hidden" onClick={() => setOpen(!open)}>
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>
      {open && (
        <div className="border-t border-white/10 px-4 pb-4 lg:hidden" data-testid="mobile-menu">
          <form onSubmit={submit} className="my-3 flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2">
            <Search className="h-4 w-4 text-slate-500" />
            <input data-testid="mobile-search-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search games..."
              className="w-full bg-transparent text-sm outline-none" />
          </form>
          {LINKS.map((l) => (
            <NavLink key={l.id} to={l.to} end={l.to === "/"} onClick={() => setOpen(false)} data-testid={`mobile-nav-link-${l.id}`} className={(s) => `block ${linkCls(s)}`}>{l.label}</NavLink>
          ))}
        </div>
      )}
    </header>
  );
}
