export default function ReviewsLoading() {
  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-pulse">
      <div className="pb-4 border-b border-token space-y-2">
        <div className="h-7 bg-surface/80 rounded-lg w-56"></div>
        <div className="h-4 bg-surface/50 rounded w-80"></div>
      </div>

      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-6 bg-surface/40 rounded-2xl border border-token space-y-3">
            <div className="h-5 bg-surface/80 rounded w-1/3"></div>
            <div className="h-4 bg-surface/60 rounded w-full"></div>
            <div className="h-8 bg-accent/20 rounded-lg w-32"></div>
          </div>
        ))}
      </div>
    </div>
  );
}
