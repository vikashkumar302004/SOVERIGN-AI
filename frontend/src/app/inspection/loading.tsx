export default function InspectionLoading() {
  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-pulse">
      <div className="pb-4 border-b border-token space-y-2">
        <div className="h-7 bg-surface/80 rounded-lg w-60"></div>
        <div className="h-4 bg-surface/50 rounded w-80"></div>
      </div>

      <div className="p-6 bg-surface/40 rounded-2xl border border-token space-y-4">
        <div className="h-5 bg-surface/70 rounded w-48"></div>
        <div className="flex gap-4">
          <div className="h-12 bg-surface/60 rounded-xl flex-1"></div>
          <div className="h-12 bg-accent/30 rounded-xl w-40"></div>
        </div>
      </div>

      <div className="p-6 bg-surface/30 rounded-2xl border border-token h-64 space-y-4">
        <div className="h-6 bg-surface/70 rounded w-1/3"></div>
        <div className="h-4 bg-surface/50 rounded w-full"></div>
        <div className="h-4 bg-surface/50 rounded w-5/6"></div>
      </div>
    </div>
  );
}
