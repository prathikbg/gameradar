import { useMemo, useState } from "react";

const H2 = ({ children }) => <h2 className="font-display mb-4 text-2xl font-extrabold uppercase">{children}</h2>;

export const Screenshots = ({ shots, onOpen }) => {
  if (!shots?.length) return null;
  return (
    <section>
      <H2>Screenshots</H2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {shots.slice(0, 9).map((s, i) => (
          <button key={s} data-testid={`screenshot-${i}`} onClick={() => onOpen(s)} className="overflow-hidden rounded-lg">
            <img src={s} alt="" loading="lazy" className="aspect-video w-full object-cover transition-transform duration-300 hover:scale-105" />
          </button>
        ))}
      </div>
    </section>
  );
};

export const About = ({ description = "" }) => {
  const [more, setMore] = useState(false);
  const long = description.length > 700;
  return (
    <section>
      <H2>About</H2>
      <p data-testid="game-detail-description" className="whitespace-pre-line leading-relaxed text-slate-300">
        {more || !long ? description : `${description.slice(0, 700)}…`}
      </p>
      {long && <button data-testid="game-detail-read-more" onClick={() => setMore(!more)} className="mt-2 text-sm font-semibold text-[#FF9F1C]">{more ? "Show less" : "Read more"}</button>}
    </section>
  );
};

export const Requirements = ({ requirements }) => {
  const keys = useMemo(() => ["minimum", "recommended"].filter((k) => requirements?.[k]), [requirements]);
  if (!keys.length) return null;
  return (
    <section>
      <H2>PC requirements</H2>
      <div className="grid gap-4 md:grid-cols-2">
        {keys.map((k) => <pre key={k} className="glass whitespace-pre-wrap rounded-xl p-4 font-mono text-xs text-slate-300">{requirements[k]}</pre>)}
      </div>
    </section>
  );
};
