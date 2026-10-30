import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "../lib/api";
import { Page } from "../components/InfoPage";

const field = "w-full rounded-lg border border-white/10 bg-[#0E1117] px-4 py-3 text-sm outline-none transition-colors focus:border-[#FF9F1C]/60";

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", subject: "General", message: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      await api.post("/contact", form);
      setSent(true);
    } catch (err) {
      const d = err.response?.data?.detail;
      toast.error(Array.isArray(d) ? "Please check your name, email and message." : d || "Couldn't send your message.");
    } finally { setSending(false); }
  };

  if (sent)
    return (
      <Page kicker="Contact" title="Message sent">
        <div className="glass flex items-center gap-3 rounded-xl p-6" data-testid="contact-success">
          <CheckCircle2 className="h-6 w-6 text-emerald-400" />
          <p>Thanks, {form.name.split(" ")[0]}! We've received your message and will get back to you at {form.email}.</p>
        </div>
      </Page>
    );

  return (
    <Page kicker="Contact" title="Contact us">
      <p>Questions, corrections, feature ideas, partnership or advertising enquiries — send us a message and we'll reply by email.</p>
      <form onSubmit={submit} className="space-y-4" data-testid="contact-form">
        <div className="grid gap-4 sm:grid-cols-2">
          <input required maxLength={100} placeholder="Your name" value={form.name} onChange={set("name")} className={field} data-testid="contact-name-input" />
          <input required type="email" maxLength={200} placeholder="Your email" value={form.email} onChange={set("email")} className={field} data-testid="contact-email-input" />
        </div>
        <select value={form.subject} onChange={set("subject")} className={field} data-testid="contact-subject-select">
          {["General", "Report a mistake", "Feature idea", "Partnership / advertising", "Privacy / my data"].map((s) => <option key={s}>{s}</option>)}
        </select>
        <textarea required minLength={10} maxLength={5000} rows={6} placeholder="Your message" value={form.message} onChange={set("message")} className={field} data-testid="contact-message-input" />
        <button disabled={sending} data-testid="contact-submit-btn" className="rounded-full bg-[#FF9F1C] px-6 py-3 font-bold text-black transition-transform hover:scale-105 disabled:opacity-50">
          {sending ? "Sending…" : "Send message"}
        </button>
      </form>
    </Page>
  );
}
