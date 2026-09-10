export default function SandboxLoading() {
  return (
    <div className="h-full max-w-6xl mx-auto space-y-6 flex flex-col animate-pulse">
      <div className="pb-4 border-b border-token flex justify-between items-center">
        <div className="space-y-2">
          <div className="h-7 bg-surface/80 rounded-lg w-56"></div>
          <div className="h-4 bg-surface/50 rounded w-72"></div>
        </div>
        <div className="h-10 bg-accent/30 rounded-xl w-32"></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1">
        {/* Editor Box Skeleton */}
        <div className="h-96 bg-surface/50 rounded-2xl border border-token p-4 space-y-3">
          <div className="h-8 bg-surface/70 rounded-xl w-40"></div>
          <div className="h-72 bg-base/60 rounded-xl"></div>
        </div>

        {/* Console Box Skeleton */}
        <div className="h-96 bg-surface/50 rounded-2xl border border-token p-4 space-y-3">
          <div className="h-8 bg-surface/70 rounded-xl w-36"></div>
          <div className="h-72 bg-base/80 rounded-xl"></div>
        </div>
      </div>
    </div>
  );
}
