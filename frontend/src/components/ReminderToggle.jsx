import { useEffect, useState } from "react";
import { BellRing } from "lucide-react";
import { toast } from "sonner";
import { api } from "../lib/api";
import { Switch } from "./ui/switch";

export default function ReminderToggle() {
  const [pref, setPref] = useState(null);
  useEffect(() => { api.get("/me/reminders").then(({ data }) => setPref(data)); }, []);
  if (!pref) return null;

  const change = async (enabled) => {
    setPref({ ...pref, enabled });
    try {
      await api.put("/me/reminders", { enabled });
      toast(enabled ? "Release-day reminders on" : "Release-day reminders off");
    } catch {
      setPref({ ...pref, enabled: !enabled });
      toast.error("Couldn't update reminders");
    }
  };

  return (
    <div className="glass mt-8 flex flex-wrap items-center gap-4 rounded-xl p-4" data-testid="reminder-toggle-card">
      <BellRing className="h-5 w-5 text-[#00F0FF]" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">Release-day email reminders</p>
        <p className="truncate text-xs text-slate-400">We'll email {pref.email} the morning a wishlisted game comes out.</p>
      </div>
      <Switch data-testid="reminder-toggle-switch" checked={pref.enabled} onCheckedChange={change}
        className="data-[state=checked]:bg-[#FF9F1C] data-[state=unchecked]:bg-slate-700" />
    </div>
  );
}
