interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-surface ${className}`}
      aria-hidden
    />
  );
}

export function StatCardSkeleton() {
  return (
    <div className="rounded-xl border border-surface-border bg-surface-raised p-4">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-3 h-8 w-16" />
    </div>
  );
}
