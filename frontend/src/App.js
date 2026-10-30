import "@/App.css";
import { useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import { AuthProvider } from "./context/AuthContext";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Releases from "./pages/Releases";
import Charts from "./pages/Charts";
import CalendarPage from "./pages/CalendarPage";
import GameDetail from "./pages/GameDetail";
import AIGuide from "./pages/AIGuide";
import Wishlist from "./pages/Wishlist";
import Search from "./pages/Search";
import AuthCallback from "./pages/AuthCallback";
import News from "./pages/News";
import Compare from "./pages/Compare";
import Showcases from "./pages/Showcases";
import About from "./pages/About";
import Privacy from "./pages/Privacy";
import Contact from "./pages/Contact";
import CookieConsent from "./components/CookieConsent";

function AppRouter() {
  const location = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [location.pathname]);
  if (location.hash?.includes("session_id=")) return <AuthCallback />;
  return (
    <>
      <Header />
      <main className="min-h-[70vh]">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/releases" element={<Releases />} />
          <Route path="/charts" element={<Charts />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/game/:id" element={<GameDetail />} />
          <Route path="/ai-guide" element={<AIGuide />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/search" element={<Search />} />
          <Route path="/news" element={<News />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="/showcases" element={<Showcases />} />
          <Route path="/about" element={<About />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/contact" element={<Contact />} />
        </Routes>
      </main>
      {location.pathname !== "/ai-guide" && <Footer />}
      <CookieConsent />
    </>
  );
}

export default function App() {
  return (
    <div className="App grain">
      <BrowserRouter>
        <AuthProvider>
          <AppRouter />
          <Toaster theme="dark" position="bottom-right" />
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}
