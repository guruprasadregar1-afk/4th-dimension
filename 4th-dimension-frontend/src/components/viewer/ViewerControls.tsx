'use client';

import { useEffect, useState } from 'react';
import type { PhysicsStats, RenderStats } from '@4th-dimension/engine';
import { useSceneInteractionStore, type QualityPreset } from '@/stores/sceneInteractionStore';

const QUALITY_OPTIONS: { id: QualityPreset; label: string; hint: string }[] = [
  { id: 'high', label: 'High', hint: 'All splats' },
  { id: 'balanced', label: 'Balanced', hint: '≤ 8k splats' },
  { id: 'performance', label: 'Performance', hint: '≤ 2k splats' },
];

interface ViewerControlsProps {
  getRenderStats?: () => RenderStats | null;
  getPhysicsStats?: () => PhysicsStats | null;
}

export function ViewerControls({
  getRenderStats,
  getPhysicsStats,
}: ViewerControlsProps) {
  const time = useSceneInteractionStore((s) => s.time);
  const duration = useSceneInteractionStore((s) => s.duration);
  const isPlaying = useSceneInteractionStore((s) => s.isPlaying);
  const hyperplane = useSceneInteractionStore((s) => s.hyperplane);
  const layers = useSceneInteractionStore((s) => s.layers);
  const setTime = useSceneInteractionStore((s) => s.setTime);
  const togglePlay = useSceneInteractionStore((s) => s.togglePlay);
  const setHyperplane = useSceneInteractionStore((s) => s.setHyperplane);
  const toggleLayer = useSceneInteractionStore((s) => s.toggleLayer);
  const renderMode = useSceneInteractionStore((s) => s.renderMode);
  const toggleRenderMode = useSceneInteractionStore((s) => s.toggleRenderMode);
  const qualityPreset = useSceneInteractionStore((s) => s.qualityPreset);
  const setQualityPreset = useSceneInteractionStore((s) => s.setQualityPreset);
  const physicsEnabled = useSceneInteractionStore((s) => s.physicsEnabled);
  const togglePhysics = useSceneInteractionStore((s) => s.togglePhysics);
  const fov = useSceneInteractionStore((s) => s.fov);
  const setFov = useSceneInteractionStore((s) => s.setFov);
  const projectionMode = useSceneInteractionStore((s) => s.projectionMode);
  const toggleProjectionMode = useSceneInteractionStore((s) => s.toggleProjectionMode);
  const setCameraPreset = useSceneInteractionStore((s) => s.setCameraPreset);
  const physicsParams = useSceneInteractionStore((s) => s.physicsParams);
  const setPhysicsParams = useSceneInteractionStore((s) => s.setPhysicsParams);
  const [stats, setStats] = useState<RenderStats | null>(null);
  const [physicsStats, setPhysicsStats] = useState<PhysicsStats | null>(null);

  useEffect(() => {
    if (!getRenderStats && !getPhysicsStats) return;

    const interval = window.setInterval(() => {
      if (getRenderStats) {
        setStats(getRenderStats());
      }
      if (getPhysicsStats) {
        setPhysicsStats(getPhysicsStats());
      }
    }, 500);

    return () => window.clearInterval(interval);
  }, [getRenderStats, getPhysicsStats]);

  const controls = [
    { key: 'xw' as const, label: 'Hyperplane x-w', color: 'bg-hyperplane-x' },
    { key: 'yw' as const, label: 'Hyperplane y-w', color: 'bg-hyperplane-y' },
    { key: 'zw' as const, label: 'Hyperplane z-w', color: 'bg-hyperplane-z' },
  ];

  const isStaticScene = duration <= 0;

  return (
    <div className="space-y-4">
      {/* Time Scrubber Section with clear 4D vs Static feedback */}
      <div
        className={`rounded-xl border p-4 transition-all ${
          isStaticScene
            ? 'border-surface-border bg-surface-raised/60'
            : 'border-emerald-500/40 bg-emerald-950/20 ring-1 ring-emerald-500/30'
        }`}
      >
        <div className="flex items-center justify-between">
          <label htmlFor="time-slider" className="text-xs font-semibold text-foreground">
            {isStaticScene ? '📷 Time Scrubber (Disabled)' : '✨ Time Scrubber (4th Dimension)'}
          </label>
          {isStaticScene ? (
            <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] text-muted border border-surface-border">
              3D · Static Reconstruction
            </span>
          ) : (
            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-400 border border-emerald-500/40 animate-pulse">
              ✨ 4D · Time-Varying Scene
            </span>
          )}
        </div>

        {isStaticScene ? (
          <p className="mt-2 text-xs text-amber-300/90 bg-amber-950/40 border border-amber-500/30 rounded-lg p-2.5">
            📷 <strong>Static 3D Scene:</strong> This scene point-cloud has no time dimension. Press <strong>Play</strong> below to animate 4D Polytope rotation in Concept Mode above.
          </p>
        ) : (
          <p className="mt-1.5 text-xs text-emerald-300/90">
            ✨ <strong>Drag the time slider or press Play:</strong> This object is actively rotating through 4D space across time.
          </p>
        )}

        <div className="mt-3">
          <input
            id="time-slider"
            type="range"
            min={0}
            max={duration || 1}
            step={0.01}
            value={time}
            disabled={isStaticScene}
            onChange={(event) => setTime(parseFloat(event.target.value))}
            className={`w-full ${isStaticScene ? 'opacity-40 cursor-not-allowed' : ''}`}
          />
          <div className="mt-2 flex items-center justify-between text-xs text-muted">
            <span>
              {time.toFixed(2)}s / {duration.toFixed(2)}s
            </span>
            <span className="hidden text-[10px] text-muted sm:inline">
              Space = play/pause
            </span>
            <button
              type="button"
              onClick={togglePlay}
              className="rounded-md border border-accent bg-accent/10 px-3 py-1 text-accent hover:bg-accent/20 transition"
            >
              {isPlaying ? 'Pause' : 'Play'}
            </button>
          </div>
        </div>
      </div>

      {/* Camera Controls Section */}
      <div className="rounded-xl border border-surface-border bg-surface-raised p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">
            Camera Controls
          </p>
          <button
            type="button"
            onClick={toggleProjectionMode}
            className="rounded-full bg-surface px-3 py-1 text-xs text-foreground ring-1 ring-surface-border transition hover:bg-surface/80"
          >
            {projectionMode === 'perspective' ? 'Perspective' : 'Orthographic'}
          </button>
        </div>

        {/* Viewpoint Presets */}
        <div className="mt-3">
          <p className="text-[10px] font-medium text-muted uppercase">Viewpoint Presets</p>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {(['front', 'top', 'side', 'isometric'] as const).map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setCameraPreset(preset)}
                className="rounded-full bg-surface px-3 py-1 text-xs capitalize text-muted ring-1 ring-surface-border transition hover:bg-accent/20 hover:text-accent hover:ring-accent/40"
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        {/* FOV Slider */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs">
            <label htmlFor="fov-slider" className="font-medium text-foreground">
              Field of View (FOV)
            </label>
            <span className="text-muted">{fov}°</span>
          </div>
          <input
            id="fov-slider"
            type="range"
            min={30}
            max={90}
            step={1}
            value={fov}
            onChange={(e) => setFov(parseInt(e.target.value, 10))}
            className="mt-1.5 w-full"
          />
        </div>
      </div>

      {/* 4D Hyperplane Rotation Section with Explanatory Onboarding Callout */}
      <div className="rounded-xl border border-surface-border bg-surface-raised p-4">
        <div className="mb-3 rounded-lg border border-accent/30 bg-accent/10 p-3">
          <p className="text-xs font-semibold text-accent flex items-center gap-1.5">
            <span>🌌</span> What is the 4th Dimension?
          </p>
          <p className="mt-1 text-xs text-foreground/90 leading-relaxed">
            These three sliders rotate the object through directions our 3D world can&apos;t normally see — that&apos;s the 4th dimension.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {controls.map((control) => (
            <div
              key={control.key}
              className="rounded-lg border border-surface-border bg-surface p-3"
            >
              <div className={`mb-2 h-1 rounded-full ${control.color}`} />
              <p className="text-xs font-medium text-foreground">{control.label}</p>
              <input
                type="range"
                min={0}
                max={6.28}
                step={0.01}
                value={hyperplane[control.key]}
                onChange={(event) =>
                  setHyperplane({
                    [control.key]: parseFloat(event.target.value),
                  })
                }
                className="mt-2 w-full"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-surface-border bg-surface-raised p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">
            Visualization
          </p>
          <button
            type="button"
            onClick={toggleRenderMode}
            className={`rounded-full px-3 py-1 text-xs transition ${
              renderMode === 'depth'
                ? 'bg-hyperplane-z/20 text-hyperplane-z ring-1 ring-hyperplane-z/40'
                : 'bg-surface text-muted ring-1 ring-surface-border'
            }`}
          >
            {renderMode === 'depth' ? 'Depth view' : 'Color view'}
          </button>
        </div>
        {renderMode === 'depth' ? (
          <p className="mt-2 text-[10px] text-muted">
            Camera-depth view — cyan is near, orange is far.
          </p>
        ) : null}
      </div>

      <div className="rounded-xl border border-surface-border bg-surface-raised p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">
            XPBD physics
          </p>
          <button
            type="button"
            onClick={togglePhysics}
            className={`rounded-full px-3 py-1 text-xs transition ${
              physicsEnabled
                ? 'bg-hyperplane-y/20 text-hyperplane-y ring-1 ring-hyperplane-y/40'
                : 'bg-surface text-muted ring-1 ring-surface-border'
            }`}
          >
            {physicsEnabled ? 'Sim ON' : 'Sim OFF'}
          </button>
        </div>
        <p className="mt-1 text-[10px] text-muted">
          Soft-body links between nearby Gaussians · press Play to run
        </p>
        {physicsEnabled && physicsStats ? (
          <p className="mt-2 text-[10px] text-muted">
            {physicsStats.particleCount.toLocaleString()} particles ·{' '}
            {physicsStats.constraintCount.toLocaleString()} constraints ·{' '}
            {physicsStats.lastStepMs.toFixed(1)} ms/step
          </p>
        ) : null}

        {/* Physical parameter sliders — visibly disabled when physics is OFF */}
        <div
          className={`mt-3 space-y-3 transition-opacity ${
            physicsEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none'
          }`}
        >
          <div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-foreground">Constraint Stiffness</span>
              <span className="text-muted">{physicsParams.stiffness.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={physicsParams.stiffness}
              onChange={(e) =>
                setPhysicsParams({ stiffness: parseFloat(e.target.value) })
              }
              className="mt-1 w-full"
            />
          </div>

          <div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-foreground">Friction / Damping</span>
              <span className="text-muted">{physicsParams.damping.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={physicsParams.damping}
              onChange={(e) =>
                setPhysicsParams({ damping: parseFloat(e.target.value) })
              }
              className="mt-1 w-full"
            />
          </div>

          <div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-foreground">Gravity</span>
              <span className="text-muted">{physicsParams.gravity.toFixed(1)} m/s²</span>
            </div>
            <input
              type="range"
              min={-10}
              max={0}
              step={0.5}
              value={physicsParams.gravity}
              onChange={(e) =>
                setPhysicsParams({ gravity: parseFloat(e.target.value) })
              }
              className="mt-1 w-full"
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-surface-border bg-surface-raised p-4">
        <p className="text-xs font-medium uppercase tracking-wider text-muted">
          Render quality
        </p>
        <p className="mt-1 text-[10px] text-muted">
          Adaptive LOD — keeps the most visible splats when over budget
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {QUALITY_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              title={option.hint}
              onClick={() => setQualityPreset(option.id)}
              className={`rounded-full px-3 py-1 text-xs transition ${
                qualityPreset === option.id
                  ? 'bg-accent/20 text-accent ring-1 ring-accent/40'
                  : 'bg-surface text-muted ring-1 ring-surface-border'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        {stats ? (
          <p className="mt-2 text-[10px] text-muted">
            {stats.renderedSplats.toLocaleString()} /{' '}
            {stats.projectedSplats.toLocaleString()} splats ·{' '}
            {stats.lastFrameMs.toFixed(1)} ms
          </p>
        ) : null}
      </div>

      <div className="rounded-xl border border-surface-border bg-surface-raised p-4">
        <p className="text-xs font-medium uppercase tracking-wider text-muted">
          Segmentation layers
        </p>
        <p className="mt-1 text-[10px] text-muted">
          Static = fixed at t=0 · Dynamic = time-varying · Transient = low opacity
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {(Object.keys(layers) as Array<keyof typeof layers>).map((layer) => (
            <button
              key={layer}
              type="button"
              onClick={() => toggleLayer(layer)}
              className={`rounded-full px-3 py-1 text-xs capitalize transition ${
                layers[layer]
                  ? 'bg-accent/20 text-accent ring-1 ring-accent/40'
                  : 'bg-surface text-muted ring-1 ring-surface-border'
              }`}
            >
              {layer}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
