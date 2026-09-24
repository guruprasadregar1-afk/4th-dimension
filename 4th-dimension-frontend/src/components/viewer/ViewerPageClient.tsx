'use client';

import type { Engine4D } from '@4th-dimension/engine/renderer';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useSceneSocket } from '@/hooks/useSceneSocket';
import { useViewerKeyboard } from '@/hooks/useViewerKeyboard';
import { fetchBff } from '@/lib/client-fetch';
import { ConceptModeViewer } from './ConceptModeViewer';
import { ViewerCanvas } from './ViewerCanvas';
import { ViewerControls } from './ViewerControls';

import { is4dScene, sceneTimestepCount, type SceneListItem } from '@/types/scene';

export default function ViewerPageClient() {
  const searchParams = useSearchParams();
  const initialSceneId = searchParams.get('scene');

  const [scenes, setScenes] = useState<SceneListItem[]>([]);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(
    initialSceneId,
  );
  const [viewMode, setViewMode] = useState<'concept' | 'splat'>('concept');
  const [listError, setListError] = useState<string | null>(null);
  const [listLoading, setListLoading] = useState(true);
  const [listAttempt, setListAttempt] = useState(0);
  const engineRef = useRef<Engine4D | null>(null);

  const selectedScene = scenes.find((s) => s.id === selectedSceneId);
  const isCurrentScene4D = selectedScene ? is4dScene(selectedScene) : false;

  const { connected, activeViewers, remoteScrub } = useSceneSocket(selectedSceneId);

  useViewerKeyboard(Boolean(selectedSceneId));

  useEffect(() => {
    if (remoteScrub && engineRef.current) {
      engineRef.current.setTime(remoteScrub.time);
      if (remoteScrub.hyperplaneAngles) {
        const h = remoteScrub.hyperplaneAngles;
        engineRef.current.setHyperplaneRotation({
          xw: h.xw ?? 0,
          yw: h.yw ?? 0,
          zw: h.zw ?? 0,
        });
      }
    }
  }, [remoteScrub]);

  const handleEngineReady = useCallback((engine: Engine4D | null) => {
    engineRef.current = engine;
  }, []);

  const getRenderStats = useCallback(
    () => engineRef.current?.getRenderStats() ?? null,
    [],
  );

  const getPhysicsStats = useCallback(
    () => engineRef.current?.getPhysicsStats() ?? null,
    [],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadScenes() {
      setListLoading(true);
      setListError(null);

      try {
        const response = await fetchBff('/api/scenes?limit=100');
        if (!response.ok) {
          throw new Error('Could not load scenes — is the backend running?');
        }
        const data = (await response.json()) as { items: SceneListItem[] };
        if (cancelled) return;

        setScenes(data.items);
        if (data.items.length > 0) {
          setSelectedSceneId((current) => {
            if (current && data.items.some((s) => s.id === current)) {
              return current;
            }
            if (
              initialSceneId &&
              data.items.some((s) => s.id === initialSceneId)
            ) {
              return initialSceneId;
            }
            const tesseract = data.items.find((s) =>
              s.title.toLowerCase().includes('tesseract'),
            );
            return tesseract ? tesseract.id : data.items[0].id;
          });
        } else {
          setSelectedSceneId(null);
        }
      } catch (error) {
        if (!cancelled) {
          setListError(
            error instanceof Error ? error.message : 'Failed to load scenes',
          );
        }
      } finally {
        if (!cancelled) {
          setListLoading(false);
        }
      }
    }

    void loadScenes();

    return () => {
      cancelled = true;
    };
  }, [initialSceneId, listAttempt]);

  return (
    <div className="flex h-full min-h-[calc(100vh-8rem)] flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">4D Viewer</h1>
          <p className="mt-1 text-sm text-muted">
            Embedded @4th-dimension/engine — load scenes from your account via
            the platform API.
          </p>
        </div>
        {selectedSceneId ? (
          <div className="flex items-center gap-2 rounded-full border border-surface-border bg-surface-raised px-3 py-1.5 text-xs text-foreground">
            <span className={`h-2 w-2 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'}`} />
            <span>👥 {activeViewers} Active Viewer{activeViewers > 1 ? 's' : ''}</span>
          </div>
        ) : null}
      </div>

      <div className="rounded-xl border border-surface-border bg-surface-raised p-4">
        <label htmlFor="scene-select" className="text-xs text-muted">
          Your scenes
        </label>
        {listLoading ? (
          <div className="mt-3 flex justify-center py-2">
            <LoadingSpinner size="sm" label="Loading scenes…" />
          </div>
        ) : (
          <select
            id="scene-select"
            value={selectedSceneId ?? ''}
            onChange={(event) =>
              setSelectedSceneId(event.target.value || null)
            }
            disabled={scenes.length === 0}
            className="mt-1 w-full rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm text-foreground disabled:opacity-50"
          >
            {scenes.length === 0 ? (
              <option value="">— no scenes yet —</option>
            ) : (
              <>
                {scenes.some((s) => is4dScene(s as any)) ? (
                  <optgroup label="✨ 4D Time-Varying Scenes (Interactive Scrubbing)">
                    {scenes
                      .filter((s) => is4dScene(s as any))
                      .map((scene) => (
                        <option key={scene.id} value={scene.id}>
                          ✨ {scene.title} (4D · {sceneTimestepCount(scene as any)} timesteps) — {scene.primitiveCount} primitives
                        </option>
                      ))}
                  </optgroup>
                ) : null}
                {scenes.some((s) => !is4dScene(s as any)) ? (
                  <optgroup label="📷 3D Static Reconstructions">
                    {scenes
                      .filter((s) => !is4dScene(s as any))
                      .map((scene) => (
                        <option key={scene.id} value={scene.id}>
                          📷 {scene.title} (3D · Static) — {scene.primitiveCount} primitives
                        </option>
                      ))}
                  </optgroup>
                ) : null}
              </>
            )}
          </select>
        )}
        {listError ? (
          <div className="mt-3">
            <ErrorBanner
              message={listError}
              onRetry={() => setListAttempt((attempt) => attempt + 1)}
            />
          </div>
        ) : null}
        {!listLoading && !listError && scenes.length === 0 ? (
          <p className="mt-2 text-xs text-muted">
            No scenes yet.{' '}
            <Link href="/scenes" className="text-accent hover:underline">
              Import a model in the library
            </Link>
            .
          </p>
        ) : null}
      </div>

      <ViewerModeSelector
        currentMode={viewMode}
        is4D={isCurrentScene4D}
        onModeChange={setViewMode}
      />

      {viewMode === 'concept' ? (
        <ConceptModeViewer scene={selectedScene} />
      ) : (
        <ViewerCanvas
          sceneId={selectedSceneId}
          onEngineReady={handleEngineReady}
        />
      )}

      <ViewerControls
        getRenderStats={getRenderStats}
        getPhysicsStats={getPhysicsStats}
      />
    </div>
  );
}

function ViewerModeSelector({
  currentMode,
  is4D,
  onModeChange,
}: {
  currentMode: 'concept' | 'splat';
  is4D: boolean;
  onModeChange: (mode: 'concept' | 'splat') => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-emerald-400">View Mode:</span>
        <span className="text-xs text-muted">
          {currentMode === 'concept'
            ? '🎓 Concept Mode — Side-by-side wireframe comparison & live 4D stretch numbers'
            : '🎨 Splat View — Photorealistic WebGL2 Gaussian rendering'}
        </span>
      </div>
      <div className="flex items-center gap-1 rounded-lg border border-surface-border bg-surface p-1">
        <button
          type="button"
          onClick={() => onModeChange('concept')}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
            currentMode === 'concept'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
              : 'text-muted hover:text-foreground'
          }`}
        >
          🎓 Concept Mode (Wireframe + Readout)
        </button>
        <button
          type="button"
          onClick={() => onModeChange('splat')}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
            currentMode === 'splat'
              ? 'bg-accent/20 text-accent border border-accent/40 shadow-sm'
              : 'text-muted hover:text-foreground'
          }`}
        >
          🎨 Splat View (Photorealistic)
        </button>
      </div>
    </div>
  );
}

