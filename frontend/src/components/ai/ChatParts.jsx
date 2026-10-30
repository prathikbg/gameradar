import { useEffect, useRef, useState } from "react";
import { Send, Sparkles } from "lucide-react";
import Markdown from "../Markdown";

const SUGGESTIONS = [
  "Best new PS5 games this month?",
  "Games like Elden Ring for a beginner",
  "Top co-op games on Xbox Game Pass",
  "Can a GTX 1660 run Cyberpunk 2077?",
];

export const Suggestions = ({ onPick }) => (
  <div className="grid gap-3 pt-6 sm:grid-cols-2">
    {SUGGESTIONS.map((s, i) => (
      <button key={s} data-testid={`ai-suggestion-${i}`} onClick={() => onPick(s)}
        className="glass flex items-start gap-2 rounded-xl p-4 text-left text-sm transition-[border-color] hover:border-[#FF9F1C]/50">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#FF9F1C]" />{s}
      </button>
    ))}
  </div>
);

const Bubble = ({ m, index }) => {
  const user = m.role === "user";
  return (
    <div className={`flex ${user ? "justify-end" : "justify-start"}`} data-testid={`ai-msg-${m.role}-${index}`}>
      <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${user ? "bg-[#FF9F1C] text-black" : "glass text-slate-200"}`}>
        {user ? m.content : m.content ? <Markdown text={m.content} /> : <span className="animate-pulse text-slate-500">Scanning the radar…</span>}
      </div>
    </div>
  );
};

export const MessageList = ({ msgs, onPick }) => {
  const endRef = useRef(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);
  return (
    <div className="no-scrollbar mt-6 flex-1 space-y-4 overflow-y-auto" data-testid="ai-chat-messages">
      {msgs.length === 0 && <Suggestions onPick={onPick} />}
      {msgs.map((m, i) => <Bubble key={m.id} m={m} index={i} />)}
      <div ref={endRef} />
    </div>
  );
};

export const ChatInput = ({ busy, onSend }) => {
  const [input, setInput] = useState("");
  const submit = (e) => {
    e.preventDefault();
    if (!input.trim() || busy) return;
    onSend(input);
    setInput("");
  };
  return (
    <form onSubmit={submit} className="glass mt-4 flex items-center gap-2 rounded-full p-1.5 pl-5">
      <input data-testid="ai-chat-input" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about any game…"
        className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-500" />
      <button data-testid="ai-chat-send-btn" disabled={busy || !input.trim()}
        className="grid h-10 w-10 place-items-center rounded-full bg-[#FF9F1C] text-black transition-opacity disabled:opacity-40">
        <Send className="h-4 w-4" />
      </button>
    </form>
  );
};
