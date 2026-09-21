'use client';

import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { StatCardSkeleton } from '@/components/ui/Skeleton';
import { useScenes } from '@/hooks/useScenes';
import { sceneDuration } from '@/types/scene';

export function DashboardStats() {
  const { data, error, isLoading, mutate } = useScenes({ limit: 100, offset: 0 });

  const items = data?.items ?? [];
  const totalPrimitives = items.reduce(
    (sum, scene) => sum + scene.primitiveCount,
    0,
  );
  const animatedScenes = items.filter((scene) => sceneDuration(scene) > 0).length;

  if (isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <ErrorBanner
        message="Could not load dashboard stats."
        onRetry={() => void mutate()}
      />
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="rounded-xl border border-surface-border bg-surface-raised p-4">
        <p className="text-xs text-muted">Total scenes</p>
        <p className="mt-1 text-2xl font-semibold text-foreground">
          {data?.pagination.total ?? 0}
        </p>
      </div>
      <div className="rounded-xl border border-surface-border bg-surface-raised p-4">
        <p className="text-xs text-muted">Total primitives</p>
        <p className="mt-1 text-2xl font-semibold text-foreground">
          {totalPrimitives.toLocaleString()}
        </p>
      </div>
      <div className="rounded-xl border border-surface-border bg-surface-raised p-4">
        <p className="text-xs text-muted">Animated (4D) scenes</p>
        <p className="mt-1 text-2xl font-semibold text-foreground">
          {animatedScenes}
        </p>
      </div>
    </div>
  );
}
