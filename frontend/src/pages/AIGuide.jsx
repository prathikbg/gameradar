import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Bot, Send, Sparkles, RotateCcw } from "lucide-react";
import { API, api } from "../lib/api";
import Markdown from "../components/Markdown";

const SUGGESTIONS = [
  "Best new PS5 games this month?",
  "Games like Elden Ring for a beginner",
  "Top co-op games on Xbox Game Pass",
  "Can a GTX 1660 run Cyberpunk 2077?",
];

const getSid = () => {
  let s = localStorage.getItem("radar_ai_sid");
  if (!s) { s = crypto.randomUUID(); localStorage.setItem("radar_ai_sid", s); }
  return s;
};

export default function AIGuide() {
  const [sid, setSid] = useState(getSid);
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [params, setParams] = useSearchParams();
  const endRef = useRef(null);
  const busyRef = useRef(false);
  const initQ = useRef(params.get("q"));

  useEffect(() => {
    let alive = true;
    api.get(`/ai/history/${sid}`).then(({ data }) => {
      if (!alive) return;
      setMsgs(data);
      const q = initQ.current;
      if (q) { initQ.current = null; setParams({}, { replace: true }); send(q); }
    });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sid]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const append = (key, add) =>
    setMsgs((m) => m.map((x) => (x.key === key ? { ...x, content: x.content + add } : x)));

  const send = async (text) => {
    const t = (text ?? input).trim();
    if (!t || busyRef.current) return;
    busyRef.current = true;
    setInput("");
    setBusy(true);
    const key = Date.now();
    setMsgs((m) => [...m, { role: "user", content: t }, { role: "assistant", content: "", key }]);
    try {
      const res = await fetch(`${API}/ai/chat`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sid, message: t }),
      });
      if (!res.ok) throw new Error("bad status");
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop();
        for (const p of parts) {
          const d = p.replace(/^data: /, "").trim();
          if (!d || d === "[DONE]") continue;
          const ev = JSON.parse(d);
          if (ev.error) throw new Error(ev.error);
          append(key, ev.delta || "");
        }
      }
    } catch {
      append(key, "\n\n_Sorry, Radar AI hit an error. Please try again._");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const reset = () => { const s = crypto.randomUUID(); localStorage.setItem("radar_ai_sid", s); setSid(s); setMsgs([]); };

  return (
    <div className="mx-auto flex h-[calc(100vh-64px)] max-w-4xl flex-col px-4 py-6 sm:px-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#00F0FF]/10 text-[#00F0FF]"><Bot className="h-6 w-6" /></div>
          <div>
            <h1 className="font-display text-2xl font-black uppercase">Radar AI</h1>
            <p className="font-mono text-xs uppercase tracking-widest text-slate-500">Your game guide · picks, tips, lore</p>
          </div>
        </div>
        <button data-testid="ai-chat-reset" onClick={reset} className="flex items-center gap-1 text-sm text-slate-400 hover:text-white"><RotateCcw className="h-4 w-4" />New chat</button>
      </div>

      <div className="no-scrollbar mt-6 flex-1 space-y-4 overflow-y-auto" data-testid="ai-chat-messages">
        {msgs.length === 0 && (
          <div className="grid gap-3 pt-6 sm:grid-cols-2">
            {SUGGESTIONS.map((s, i) => (
              <button key={s} data-testid={`ai-suggestion-${i}`} onClick={() => send(s)}
                className="glass flex items-start gap-2 rounded-xl p-4 text-left text-sm transition-[border-color] hover:border-[#FF9F1C]/50">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#FF9F1C]" />{s}
              </button>
            ))}
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`} data-testid={`ai-msg-${m.role}-${i}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${m.role === "user" ? "bg-[#FF9F1C] text-black" : "glass text-slate-200"}`}>
              {m.role === "user" ? m.content : m.content ? <Markdown text={m.content} /> : <span className="animate-pulse text-slate-500">Scanning the radar…</span>}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <form onSubmit={(e) => { e.preventDefault(); send(); }} className="glass mt-4 flex items-center gap-2 rounded-full p-1.5 pl-5">
        <input data-testid="ai-chat-input" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about any game…"
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-500" />
        <button data-testid="ai-chat-send-btn" disabled={busy || !input.trim()}
          className="grid h-10 w-10 place-items-center rounded-full bg-[#FF9F1C] text-black transition-opacity disabled:opacity-40">
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
