import { ExternalLink } from "lucide-react";
import PriceBox from "../PriceBox";
import { fmtDate } from "../../lib/api";

const Info = ({ label, items }) => items?.length ? (
  <div><p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">{label}</p><p className="mt-1 text-sm text-slate-200">{items.join(", ")}</p></div>
) : null;

const Facts = ({ g }) => (
  <div className="glass corner space-y-4 rounded-xl p-5">
    <Info label="Released" items={[fmtDate(g.released)]} />
    <Info label="Platforms" items={g.platforms} />
    <Info label="Developer" items={g.developers} />
    <Info label="Publisher" items={g.publishers} />
    <Info label="Age rating" items={g.esrb ? [g.esrb] : []} />
    {g.website && <a href={g.website} target="_blank" rel="noreferrer" data-testid="game-website-link" className="flex items-center gap-1 text-sm text-[#00F0FF] hover:underline">Official website <ExternalLink className="h-3 w-3" /></a>}
  </div>
);

const Stores = ({ stores }) => !stores?.length ? null : (
  <div className="glass rounded-xl p-5">
    <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-slate-500">Where to buy</p>
    <div className="space-y-2">
      {stores.map((s) => (
        <a key={s.name} href={s.url} target="_blank" rel="noreferrer" data-testid={`store-link-${s.name.toLowerCase().replace(/\s+/g, "-")}`}
          className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2.5 text-sm font-semibold transition-colors hover:bg-[#FF9F1C] hover:text-black">
          {s.name} <ExternalLink className="h-4 w-4" />
        </a>
      ))}
    </div>
  </div>
);

export default function GameSidebar({ g }) {
  return (
    <aside className="space-y-6 lg:col-span-4">
      <PriceBox gameId={g.id} />
      <Facts g={g} />
      <Stores stores={g.stores} />
      {g.tags?.length > 0 && (
        <div className="flex flex-wrap gap-2">{g.tags.map((t) => <span key={t} className="rounded bg-white/5 px-2 py-1 text-xs text-slate-400">#{t}</span>)}</div>
      )}
    </aside>
  );
}
