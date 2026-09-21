'use client';

import type { SceneQueryParams } from '@/types/scene';

interface SceneFiltersProps {
  params: SceneQueryParams;
  onChange: (next: SceneQueryParams) => void;
}

export function SceneFilters({ params, onChange }: SceneFiltersProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="sm:col-span-2">
        <label htmlFor="scene-search" className="mb-1 block text-xs text-muted">
          Search title or tags
        </label>
        <input
          id="scene-search"
          type="search"
          placeholder="e.g. Tesseract, demo…"
          value={params.search ?? ''}
          onChange={(event) =>
            onChange({ ...params, search: event.target.value, offset: 0 })
          }
          className="w-full rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm text-foreground outline-none ring-accent focus:ring-1"
        />
      </div>

      <div>
        <label htmlFor="min-primitives" className="mb-1 block text-xs text-muted">
          Min primitives
        </label>
        <input
          id="min-primitives"
          type="number"
          min={0}
          value={params.minPrimitiveCount ?? ''}
          onChange={(event) =>
            onChange({
              ...params,
              minPrimitiveCount: event.target.value
                ? parseInt(event.target.value, 10)
                : undefined,
              offset: 0,
            })
          }
          className="w-full rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm text-foreground"
        />
      </div>

      <div>
        <label htmlFor="max-primitives" className="mb-1 block text-xs text-muted">
          Max primitives
        </label>
        <input
          id="max-primitives"
          type="number"
          min={0}
          value={params.maxPrimitiveCount ?? ''}
          onChange={(event) =>
            onChange({
              ...params,
              maxPrimitiveCount: event.target.value
                ? parseInt(event.target.value, 10)
                : undefined,
              offset: 0,
            })
          }
          className="w-full rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm text-foreground"
        />
      </div>

      <div>
        <label htmlFor="min-duration" className="mb-1 block text-xs text-muted">
          Min duration (s)
        </label>
        <input
          id="min-duration"
          type="number"
          min={0}
          step={0.1}
          value={params.minDuration ?? ''}
          onChange={(event) =>
            onChange({
              ...params,
              minDuration: event.target.value
                ? parseFloat(event.target.value)
                : undefined,
              offset: 0,
            })
          }
          className="w-full rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm text-foreground"
        />
      </div>

      <div>
        <label htmlFor="max-duration" className="mb-1 block text-xs text-muted">
          Max duration (s)
        </label>
        <input
          id="max-duration"
          type="number"
          min={0}
          step={0.1}
          value={params.maxDuration ?? ''}
          onChange={(event) =>
            onChange({
              ...params,
              maxDuration: event.target.value
                ? parseFloat(event.target.value)
                : undefined,
              offset: 0,
            })
          }
          className="w-full rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm text-foreground"
        />
      </div>
    </div>
  );
}
