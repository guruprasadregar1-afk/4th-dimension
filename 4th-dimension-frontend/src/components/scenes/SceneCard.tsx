'use client';

import Link from 'next/link';
import { useState } from 'react';
import { cloneScene, exportSceneJson } from '@/lib/export-scene';
import {
  formatBytes,
  is4dScene,
  sceneDuration,
  sceneTimestepCount,
  type SceneListItem,
} from '@/types/scene';

interface SceneCardProps {
  scene: SceneListItem;
  onSceneCloned?: () => void;
}

export function SceneCard({ scene, onSceneCloned }: SceneCardProps) {
  const [exporting, setExporting] = useState(false);
  const [cloning, setCloning] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [cloneError, setCloneError] = useState<string | null>(null);

  const is4D = is4dScene(scene);
  const duration = sceneDuration(scene);
  const timesteps = sceneTimestepCount(scene);

  async function handleExport() {
    setExportError(null);
    setExporting(true);
    try {
      await exportSceneJson(scene);
    } catch (error) {
      setExportError(
        error instanceof Error ? error.message : 'Export failed',
      );
    } finally {
      setExporting(false);
    }
  }

  async function handleClone() {
    setCloneError(null);
    setCloning(true);
    try {
      await cloneScene(scene.id);
      onSceneCloned?.();
    } catch (error) {
      setCloneError(
        error instanceof Error ? error.message : 'Clone failed',
      );
    } finally {
      setCloning(false);
    }
  }

  return (
    <article className="flex flex-col rounded-lg border border-surface-border bg-surface p-4 transition hover:border-accent/40">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <h2 className="text-sm font-semibold text-foreground">{scene.title}</h2>
          {is4D ? (
            <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
              ✨ 4D · {timesteps} timesteps
            </span>
          ) : (
            <span className="rounded-full border border-surface-border bg-surface-raised px-2 py-0.5 text-[10px] text-muted">
              📷 3D · Static
            </span>
          )}
        </div>
        <span className="shrink-0 rounded-full bg-surface-raised px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted">
          {scene.storageType}
        </span>
      </div>

      {scene.description ? (
        <p className="mt-2 line-clamp-2 text-xs text-muted">{scene.description}</p>
      ) : (
        <p className="mt-2 text-xs italic text-muted/70">No description</p>
      )}

      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div>
          <dt className="text-muted">Primitives</dt>
          <dd className="font-medium text-foreground">{scene.primitiveCount}</dd>
        </div>
        <div>
          <dt className="text-muted">Duration</dt>
          <dd className="font-medium text-foreground">
            {duration > 0 ? `${duration.toFixed(1)}s` : 'Static'}
          </dd>
        </div>
        <div>
          <dt className="text-muted">Storage</dt>
          <dd className="font-medium text-foreground">
            {formatBytes(scene.storageSizeBytes)}
          </dd>
        </div>
        <div>
          <dt className="text-muted">Updated</dt>
          <dd className="font-medium text-foreground">
            {new Date(scene.updatedAt).toLocaleDateString()}
          </dd>
        </div>
      </dl>

      {scene.tags.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1">
          {scene.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] text-accent"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={`/viewer?scene=${scene.id}`}
          className="rounded-md border border-accent bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent transition hover:bg-accent/20"
        >
          Open in viewer
        </Link>
        <button
          type="button"
          onClick={() => void handleExport()}
          disabled={exporting || cloning}
          className="rounded-md border border-surface-border bg-surface-raised px-3 py-1.5 text-xs text-foreground transition hover:border-accent/40 disabled:opacity-60"
        >
          {exporting ? 'Exporting…' : 'Export JSON'}
        </button>
        <button
          type="button"
          onClick={() => void handleClone()}
          disabled={exporting || cloning}
          className="rounded-md border border-surface-border bg-surface-raised px-3 py-1.5 text-xs text-foreground transition hover:border-accent/40 disabled:opacity-60"
        >
          {cloning ? 'Cloning…' : 'Duplicate'}
        </button>
      </div>

      {exportError ? (
        <p className="mt-2 text-xs text-hyperplane-x">{exportError}</p>
      ) : null}
      {cloneError ? (
        <p className="mt-2 text-xs text-hyperplane-x">{cloneError}</p>
      ) : null}
    </article>
  );
}
