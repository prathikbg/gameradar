import { useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Bot, RotateCcw } from "lucide-react";
import useRadarChat from "../hooks/useRadarChat";
import { ChatInput, MessageList } from "../components/ai/ChatParts";

export default function AIGuide() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const initialQ = useRef(params.get("q"));
  const { msgs, busy, send, reset } = useRadarChat(initialQ.current, () => navigate("/ai-guide", { replace: true }));

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

      <MessageList msgs={msgs} onPick={send} />
      <ChatInput busy={busy} onSend={send} />
    </div>
  );
}
