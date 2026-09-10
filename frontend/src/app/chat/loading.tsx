export default function ChatLoading() {
  return (
    <div className="flex h-full w-full bg-base overflow-hidden animate-pulse">
      {/* Sidebar History Skeleton */}
      <div className="w-64 border-r border-token bg-surface/30 p-4 space-y-4 hidden md:flex flex-col">
        <div className="h-9 bg-surface/80 rounded-xl w-full"></div>
        <div className="space-y-2 pt-2">
          <div className="h-4 bg-surface/50 rounded w-1/3"></div>
          <div className="h-10 bg-surface/60 rounded-xl w-full"></div>
          <div className="h-10 bg-surface/60 rounded-xl w-full"></div>
          <div className="h-10 bg-surface/60 rounded-xl w-full"></div>
          <div className="h-10 bg-surface/60 rounded-xl w-full"></div>
        </div>
      </div>

      {/* Main Chat Content Skeleton */}
      <div className="flex-1 flex flex-col justify-between p-6 space-y-4">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between pb-4 border-b border-token">
          <div className="space-y-2">
            <div className="h-6 bg-surface/80 rounded-lg w-48"></div>
            <div className="h-3 bg-surface/50 rounded w-32"></div>
          </div>
          <div className="h-8 bg-surface/70 rounded-lg w-28"></div>
        </div>

        {/* Message Area Skeleton */}
        <div className="flex-1 space-y-6 overflow-hidden py-4">
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 rounded-full bg-surface/80 shrink-0"></div>
            <div className="space-y-2 w-2/3">
              <div className="h-4 bg-surface/70 rounded w-full"></div>
              <div className="h-4 bg-surface/60 rounded w-4/5"></div>
            </div>
          </div>

          <div className="flex items-start space-x-3 justify-end">
            <div className="space-y-2 w-1/2">
              <div className="h-12 bg-accent/20 rounded-2xl w-full"></div>
            </div>
            <div className="w-8 h-8 rounded-full bg-accent/30 shrink-0"></div>
          </div>

          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 rounded-full bg-surface/80 shrink-0"></div>
            <div className="space-y-2 w-3/4">
              <div className="h-4 bg-surface/70 rounded w-full"></div>
              <div className="h-4 bg-surface/60 rounded w-5/6"></div>
              <div className="h-4 bg-surface/50 rounded w-2/3"></div>
            </div>
          </div>
        </div>

        {/* Input Bar Skeleton */}
        <div className="h-14 bg-surface/80 rounded-2xl border border-token w-full"></div>
      </div>
    </div>
  );
}
