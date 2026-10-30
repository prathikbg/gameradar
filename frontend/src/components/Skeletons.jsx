const SKELETON_IDS = Array.from({ length: 24 }, (_, i) => `skeleton-${i}`);

export default function Skeletons({ n = 8, className }) {
  return <>{SKELETON_IDS.slice(0, n).map((id) => <div key={id} className={`animate-pulse rounded-xl bg-slate-800/60 ${className}`} />)}</>;
}
