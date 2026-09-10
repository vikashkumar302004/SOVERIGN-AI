export default function AdminLoading() {
  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-pulse">
      <div className="pb-4 border-b border-token space-y-2">
        <div className="h-7 bg-surface/80 rounded-lg w-56"></div>
        <div className="h-4 bg-surface/50 rounded w-72"></div>
      </div>

      <div className="bg-surface/40 rounded-2xl border border-token p-6 space-y-4">
        <div className="h-6 bg-surface/70 rounded w-40"></div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-surface/60 rounded-xl p-4 flex justify-between items-center">
              <div className="h-5 bg-surface/80 rounded w-48"></div>
              <div className="h-8 bg-accent/20 rounded-lg w-32"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
