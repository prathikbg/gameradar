export const Page = ({ kicker, title, updated, children }) => (
  <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
    <p className="font-mono text-xs uppercase tracking-[0.25em] text-[#00F0FF]">{kicker}</p>
    <h1 className="font-display mt-2 text-4xl font-black uppercase tracking-tight sm:text-5xl">{title}</h1>
    {updated && <p className="mt-2 font-mono text-xs text-slate-500">Last updated: {updated}</p>}
    <div className="mt-10 space-y-8 leading-relaxed text-slate-300">{children}</div>
  </div>
);

export const Section = ({ title, children }) => (
  <section className="space-y-3">
    <h2 className="font-display text-xl font-bold text-white">{title}</h2>
    {children}
  </section>
);

export const List = ({ items }) => (
  <ul className="list-disc space-y-1.5 pl-5">{items.map((i) => <li key={i}>{i}</li>)}</ul>
);
