import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export default function SectionHead({ kicker, title, to, testId }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-[#00F0FF]">{kicker}</p>
        <h2 className="font-display mt-1 text-2xl font-extrabold uppercase tracking-tight sm:text-3xl">{title}</h2>
      </div>
      {to && (
        <Link to={to} data-testid={testId} className="group flex items-center gap-1 text-sm font-semibold text-slate-400 hover:text-[#FF9F1C]">
          View all <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      )}
    </div>
  );
}
