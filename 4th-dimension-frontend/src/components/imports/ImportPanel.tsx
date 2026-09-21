'use client';

import { useState } from 'react';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { Skeleton } from '@/components/ui/Skeleton';
import { useImports } from '@/hooks/useImports';
import { ImportJobRow } from './ImportJobRow';
import { ImportUploader } from './ImportUploader';

export function ImportPanel() {
  const [expanded, setExpanded] = useState(true);
  const { data, error, isLoading, mutate } = useImports(5);

  function handleImportComplete() {
    void mutate();
  }

  return (
    <section className="rounded-xl border border-surface-border bg-surface-raised">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Import 4D / 3DGS model
          </h2>
          <p className="mt-0.5 text-xs text-muted">
            Upload native JSON, 3DGS PLY, SPLAT, or 4D keyframe files
          </p>
        </div>
        <span className="text-xs text-muted">{expanded ? 'Hide' : 'Show'}</span>
      </button>

      {expanded ? (
        <div className="space-y-4 border-t border-surface-border px-4 py-4">
          <ImportUploader onImportComplete={handleImportComplete} />

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-medium uppercase tracking-wider text-muted">
                Recent imports
              </h3>
              <button
                type="button"
                onClick={() => void mutate()}
                className="text-xs text-accent hover:underline"
              >
                Refresh
              </button>
            </div>

            {error ? (
              <ErrorBanner
                message="Could not load import history."
                onRetry={() => void mutate()}
              />
            ) : null}

            {isLoading ? <Skeleton className="h-16" /> : null}

            {!isLoading && (data?.items.length ?? 0) === 0 ? (
              <p className="text-xs text-muted">No imports yet.</p>
            ) : null}

            <div className="space-y-2">
              {data?.items.map((job) => (
                <ImportJobRow key={job.id} job={job} />
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
