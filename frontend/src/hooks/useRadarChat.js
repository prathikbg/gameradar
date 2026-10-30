import { useCallback, useEffect, useRef, useState } from "react";
import { API, api } from "../lib/api";

const newId = () => crypto.randomUUID();

const getSid = () => {
  let s = localStorage.getItem("radar_ai_sid");
  if (!s) { s = newId(); localStorage.setItem("radar_ai_sid", s); }
  return s;
};

async function readStream(res, onDelta) {
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) return;
    buf += dec.decode(value, { stream: true });
    const parts = buf.split("\n\n");
    buf = parts.pop();
    for (const p of parts) {
      const d = p.replace(/^data: /, "").trim();
      if (!d || d === "[DONE]") continue;
      const ev = JSON.parse(d);
      if (ev.error) throw new Error(ev.error);
      onDelta(ev.delta || "");
    }
  }
}

export default function useRadarChat(initialQuestion, onInitialSent) {
  const [sid, setSid] = useState(getSid);
  const [msgs, setMsgs] = useState([]);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const pendingQ = useRef(initialQuestion);
  const onSentRef = useRef(onInitialSent);

  const append = useCallback((id, add) =>
    setMsgs((m) => m.map((x) => (x.id === id ? { ...x, content: x.content + add } : x))), []);

  const send = useCallback(async (text) => {
    const t = (text || "").trim();
    if (!t || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    const id = newId();
    setMsgs((m) => [...m, { id: newId(), role: "user", content: t }, { id, role: "assistant", content: "" }]);
    try {
      const res = await fetch(`${API}/ai/chat`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sid, message: t }),
      });
      if (!res.ok) throw new Error("bad status");
      await readStream(res, (delta) => append(id, delta));
    } catch {
      append(id, "\n\n_Sorry, Radar AI hit an error. Please try again._");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, [sid, append]);

  useEffect(() => {
    let alive = true;
    api.get(`/ai/history/${sid}`).then(({ data }) => {
      if (!alive) return;
      setMsgs(data.map((m) => ({ ...m, id: `${m.created_at}-${m.role}` })));
      const q = pendingQ.current;
      if (q) { pendingQ.current = null; onSentRef.current?.(); send(q); }
    });
    return () => { alive = false; };
  }, [sid, send]);

  const reset = useCallback(() => {
    const s = newId();
    localStorage.setItem("radar_ai_sid", s);
    setSid(s);
    setMsgs([]);
  }, []);

  return { msgs, busy, send, reset };
}
