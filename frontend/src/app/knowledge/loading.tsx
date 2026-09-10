export default function KnowledgeLoading() {
  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-pulse">
      <div className="pb-4 border-b border-token space-y-2">
        <div className="h-7 bg-surface/80 rounded-lg w-64"></div>
        <div className="h-4 bg-surface/50 rounded w-96"></div>
      </div>

      {/* Search Input Bar Skeleton */}
      <div className="h-14 bg-surface/60 rounded-2xl border border-token w-full flex items-center p-4"></div>

      {/* Results Skeleton */}
      <div className="space-y-4 pt-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-6 bg-surface/40 rounded-2xl border border-token space-y-3">
            <div className="flex justify-between">
              <div className="h-5 bg-surface/80 rounded w-1/3"></div>
              <div className="h-4 bg-accent/20 rounded w-20"></div>
            </div>
            <div className="h-4 bg-surface/60 rounded w-full"></div>
            <div className="h-4 bg-surface/50 rounded w-4/5"></div>
          </div>
        ))}
      </div>
    </div>
  );
}
