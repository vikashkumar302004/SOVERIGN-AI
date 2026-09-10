export default function GenerateLoading() {
  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-pulse">
      <div className="pb-4 border-b border-token space-y-2">
        <div className="h-7 bg-surface/80 rounded-lg w-64"></div>
        <div className="h-4 bg-surface/50 rounded w-80"></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 bg-surface/40 rounded-2xl border border-token space-y-4">
          <div className="h-5 bg-surface/70 rounded w-1/3"></div>
          <div className="h-28 bg-surface/60 rounded-xl w-full"></div>
          <div className="h-10 bg-accent/30 rounded-xl w-full"></div>
        </div>

        <div className="p-6 bg-surface/40 rounded-2xl border border-token space-y-4">
          <div className="h-5 bg-surface/70 rounded w-1/3"></div>
          <div className="h-40 bg-surface/60 rounded-xl w-full"></div>
        </div>
      </div>
    </div>
  );
}
