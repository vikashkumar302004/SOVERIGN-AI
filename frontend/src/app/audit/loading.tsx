export default function AuditLoading() {
  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-pulse">
      <div className="pb-4 border-b border-token space-y-2">
        <div className="h-7 bg-surface/80 rounded-lg w-52"></div>
        <div className="h-4 bg-surface/50 rounded w-80"></div>
      </div>

      <div className="h-12 bg-surface/60 rounded-xl border border-token w-full"></div>

      <div className="space-y-3">
        {[1, 2, 3, 5, 6].map((i) => (
          <div key={i} className="h-16 bg-surface/40 rounded-xl border border-token p-4 flex justify-between items-center">
            <div className="space-y-1 w-1/3">
              <div className="h-4 bg-surface/80 rounded w-full"></div>
              <div className="h-3 bg-surface/50 rounded w-2/3"></div>
            </div>
            <div className="h-6 bg-accent/20 rounded w-24"></div>
          </div>
        ))}
      </div>
    </div>
  );
}
