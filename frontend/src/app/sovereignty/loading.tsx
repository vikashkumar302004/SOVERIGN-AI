export default function SovereigntyLoading() {
  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-pulse">
      <div className="pb-4 border-b border-token space-y-2">
        <div className="h-7 bg-surface/80 rounded-lg w-60"></div>
        <div className="h-4 bg-surface/50 rounded w-80"></div>
      </div>

      <div className="h-32 bg-surface/40 rounded-2xl border border-token p-6 space-y-3">
        <div className="h-6 bg-surface/80 rounded w-1/4"></div>
        <div className="h-4 bg-surface/50 rounded w-1/2"></div>
      </div>

      <div className="space-y-3">
        <div className="h-6 bg-surface/70 rounded w-36"></div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 bg-surface/30 rounded-xl border border-token p-4"></div>
        ))}
      </div>
    </div>
  );
}
