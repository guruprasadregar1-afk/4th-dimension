'use client';

import { Engine4D } from '@4th-dimension/engine';
import { useEffect, useRef, useState } from 'react';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { fetchBff } from '@/lib/client-fetch';
import { useSceneInteractionStore } from '@/stores/sceneInteractionStore';

interface ViewerCanvasProps {
  sceneId: string | null;
  onEngineReady?: (engine: Engine4D | null) => void;
}

export function ViewerCanvas({ sceneId, onEngineReady }: ViewerCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine4D | null>(null);
  const [status, setStatus] = useState('Select a scene to render.');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);

  const setDuration = useSceneInteractionStore((s) => s.setDuration);
  const setTime = useSceneInteractionStore((s) => s.setTime);
  const setPlaying = useSceneInteractionStore((s) => s.setPlaying);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new Engine4D({ canvas, enableOrbitControls: true });
    engineRef.current = engine;
    onEngineReady?.(engine);

    engine.setOnTimeChange((time, duration) => {
      setTime(time);
      setDuration(duration);
    });

    const onResize = () => {
      const rect = canvas.getBoundingClientRect();
      engine.context.resize(rect.width, rect.height);
      engine.renderer.render();
    };

    window.addEventListener('resize', onResize);
    onResize();

    const unsubscribe = useSceneInteractionStore.subscribe((state, prev) => {
      if (state.time !== prev.time && Math.abs(state.time - engine.getTime()) > 0.001) {
        engine.setTime(state.time);
      }
      if (state.hyperplane !== prev.hyperplane) {
        engine.setHyperplaneRotation(state.hyperplane);
      }
      if (state.isPlaying !== prev.isPlaying) {
        if (state.isPlaying) engine.play();
        else engine.pause();
      }
      if (state.renderMode !== prev.renderMode) {
        engine.setRenderMode(state.renderMode);
      }
      if (state.layers !== prev.layers) {
        engine.setLayerVisibility(state.layers);
      }
      if (state.qualityPreset !== prev.qualityPreset) {
        engine.setQualityPreset(state.qualityPreset);
      }
      if (state.physicsEnabled !== prev.physicsEnabled) {
        engine.setPhysicsEnabled(state.physicsEnabled);
      }
      if (state.fov !== prev.fov) {
        engine.setFov(state.fov);
      }
      if (state.projectionMode !== prev.projectionMode) {
        engine.setProjectionMode(state.projectionMode);
      }
      if (state.cameraPreset !== prev.cameraPreset && state.cameraPreset !== null) {
        engine.setCameraPreset(state.cameraPreset);
      }
      if (state.physicsParams !== prev.physicsParams) {
        engine.configurePhysicsParams(state.physicsParams);
      }
    });

    return () => {
      unsubscribe();
      window.removeEventListener('resize', onResize);
      engine.dispose();
      engineRef.current = null;
      onEngineReady?.(null);
    };
  }, [onEngineReady, setDuration, setTime, setPlaying]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || !sceneId) {
      setStatus('Select a scene to render.');
      setIsLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;

    async function loadScene() {
      const activeEngine = engineRef.current;
      if (!activeEngine) return;

      setError(null);
      setIsLoading(true);
      setStatus('Loading 4D primitives…');
      setPlaying(false);

      try {
        const response = await fetchBff(`/api/scenes/${sceneId}/primitives`);
        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as
            | { error?: string }
            | null;
          throw new Error(body?.error ?? 'Failed to load scene from API');
        }

        const scene = (await response.json()) as {
          id: string;
          title: string;
          duration: number;
          primitives: Parameters<Engine4D['loadScene']>[0]['primitives'];
        };

        if (cancelled) return;

        scene.duration = scene.duration ?? 0;

        activeEngine.loadScene({
          id: scene.id,
          title: scene.title,
          duration: scene.duration,
          primitives: scene.primitives,
        });

        const {
          renderMode,
          layers,
          qualityPreset,
          physicsEnabled,
          fov,
          projectionMode,
          physicsParams,
        } = useSceneInteractionStore.getState();
        activeEngine.setRenderMode(renderMode);
        activeEngine.setLayerVisibility(layers);
        activeEngine.setQualityPreset(qualityPreset);
        activeEngine.setPhysicsEnabled(physicsEnabled);
        activeEngine.setFov(fov);
        activeEngine.setProjectionMode(projectionMode);
        activeEngine.configurePhysicsParams(physicsParams);

        setDuration(scene.duration);
        setTime(0);
        setStatus(`Rendering "${scene.title}" — drag to orbit · scroll to zoom`);
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error ? loadError.message : 'Load failed',
          );
          setStatus('Failed to load scene.');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadScene();

    return () => {
      cancelled = true;
    };
  }, [sceneId, loadAttempt, setDuration, setTime, setPlaying]);

  return (
    <div className="flex min-h-[360px] flex-1 flex-col rounded-xl border border-surface-border bg-canvas shadow-inner-glow">
      <div className="border-b border-surface-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">4D Gaussian canvas</h2>
        <p className="mt-1 text-xs text-muted">{status}</p>
      </div>
      {error ? (
        <div className="px-4 pb-2">
          <ErrorBanner
            message={error}
            onRetry={() => setLoadAttempt((attempt) => attempt + 1)}
          />
        </div>
      ) : null}
      <div className="relative flex flex-1 items-stretch p-2">
        <canvas
          ref={canvasRef}
          className="h-full min-h-[300px] w-full rounded-lg bg-[#0d0d14]"
        />
        {!sceneId ? (
          <div className="absolute inset-2 flex items-center justify-center rounded-lg bg-[#0d0d14]/90">
            <p className="text-sm text-muted">
              Choose a scene above or import one from the library.
            </p>
          </div>
        ) : null}
        {isLoading ? (
          <div className="absolute inset-2 flex items-center justify-center rounded-lg bg-[#0d0d14]/80 backdrop-blur-sm">
            <LoadingSpinner label="Loading primitives…" />
          </div>
        ) : null}
      </div>
    </div>
  );
}
