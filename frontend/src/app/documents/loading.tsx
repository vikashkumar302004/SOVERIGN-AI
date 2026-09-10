export default function DocumentsLoading() {
  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-pulse">
      {/* Header Skeleton */}
      <div className="pb-4 border-b border-token flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 bg-surface/80 rounded-lg w-56"></div>
          <div className="h-4 bg-surface/50 rounded w-80"></div>
        </div>
        <div className="h-10 bg-accent/20 rounded-xl w-36"></div>
      </div>

      {/* Grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 h-64 bg-surface/40 rounded-2xl border border-token p-6 space-y-4">
          <div className="h-5 bg-surface/70 rounded w-1/2"></div>
          <div className="h-32 bg-surface/60 rounded-xl border border-dashed border-token"></div>
          <div className="h-10 bg-accent/30 rounded-xl w-full"></div>
        </div>

        <div className="md:col-span-2 space-y-4">
          <div className="h-6 bg-surface/70 rounded w-40"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 bg-surface/50 rounded-2xl border border-token p-4 flex items-center justify-between">
                <div className="flex items-center space-x-3 w-2/3">
                  <div className="w-8 h-8 rounded-lg bg-surface/80"></div>
                  <div className="space-y-1 flex-1">
                    <div className="h-4 bg-surface/80 rounded w-1/2"></div>
                    <div className="h-3 bg-surface/50 rounded w-1/3"></div>
                  </div>
                </div>
                <div className="h-8 bg-surface/70 rounded-lg w-20"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
