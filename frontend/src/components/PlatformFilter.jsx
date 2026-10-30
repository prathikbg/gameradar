import { PLATFORMS } from "../lib/api";

export default function PlatformFilter({ value, onChange }) {
  return (
    <div className="no-scrollbar flex gap-2 overflow-x-auto" data-testid="platform-filter">
      {PLATFORMS.map((p) => (
        <button key={p.key} data-testid={`platform-filter-${p.key}`} onClick={() => onChange(p.key)}
          className={`whitespace-nowrap rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${
            value === p.key ? "border-[#FF9F1C] bg-[#FF9F1C] text-black" : "border-white/10 text-slate-300 hover:border-white/30"}`}>
          {p.label}
        </button>
      ))}
    </div>
  );
}
