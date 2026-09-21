'use client';

import { useState } from 'react';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { Skeleton } from '@/components/ui/Skeleton';
import { useScenes } from '@/hooks/useScenes';
import type { SceneQueryParams } from '@/types/scene';
import { SceneCard } from './SceneCard';
import { SceneFilters } from './SceneFilters';

const PAGE_SIZE = 12;

export function SceneLibrary() {
  const [params, setParams] = useState<SceneQueryParams>({
    limit: PAGE_SIZE,
    offset: 0,
  });

  const { data, error, isLoading, mutate } = useScenes(params);

  const items = data?.items ?? [];
  const pagination = data?.pagination;

  return (
    <div className="flex flex-col gap-4">
      <SceneFilters params={params} onChange={setParams} />

      <div className="flex items-center justify-between text-xs text-muted">
        <span>
          {pagination
            ? `${pagination.total} scene${pagination.total === 1 ? '' : 's'}`
            : 'Loading…'}
        </span>
        <button
          type="button"
          onClick={() => void mutate()}
          className="rounded-md border border-surface-border px-2 py-1 text-foreground hover:border-accent/40"
        >
          Refresh
        </button>
      </div>

      {error ? (
        <ErrorBanner
          message={
            error instanceof Error
              ? error.message
              : 'Could not load scenes. Check that you are logged in and the backend is running.'
          }
          onRetry={() => void mutate()}
        />
      ) : null}

      {isLoading && items.length === 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-48 border border-surface-border" />
          ))}
        </div>
      ) : null}

      {!isLoading && items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-surface-border p-8 text-center text-sm text-muted">
          No scenes match your filters. Use the import panel above to upload a
          model, or run the backend seed script for demo data.
        </div>
      ) : null}

      {items.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((scene) => (
            <SceneCard
              key={scene.id}
              scene={scene}
              onSceneCloned={() => void mutate()}
            />          ))}
        </div>
      ) : null}

      {pagination && pagination.total > PAGE_SIZE ? (
        <div className="flex items-center justify-between border-t border-surface-border pt-4">
          <button
            type="button"
            disabled={(params.offset ?? 0) <= 0}
            onClick={() =>
              setParams((current) => ({
                ...current,
                offset: Math.max(0, (current.offset ?? 0) - PAGE_SIZE),
              }))
            }
            className="rounded-md border border-surface-border px-3 py-1.5 text-sm text-foreground disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-xs text-muted">
            {(params.offset ?? 0) + 1}–
            {Math.min((params.offset ?? 0) + items.length, pagination.total)}{' '}
            of {pagination.total}
          </span>
          <button
            type="button"
            disabled={!pagination.hasMore}
            onClick={() =>
              setParams((current) => ({
                ...current,
                offset: (current.offset ?? 0) + PAGE_SIZE,
              }))
            }
            className="rounded-md border border-surface-border px-3 py-1.5 text-sm text-foreground disabled:opacity-40"
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
}
