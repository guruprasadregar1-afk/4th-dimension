'use client';

import {
  generateCube3DGeometry,
  generateOrthoplex16Geometry,
  generateSimplex5Geometry,
  generateTesseractGeometry,
  slicePolytopeHyperplane,
  type Hyperplane4D,
  type PolytopeGeometry4D,
} from '@4th-dimension/engine';
import { useEffect, useRef, useState } from 'react';
import { fetchBff } from '@/lib/client-fetch';
import { useSceneInteractionStore } from '@/stores/sceneInteractionStore';
import { is4dScene, type SceneListItem } from '@/types/scene';

type PolytopeType = 'tesseract' | 'simplex5' | 'orthoplex16' | 'scene_wireframe';

interface ConceptModeViewerProps {
  scene?: SceneListItem;
}

export function ConceptModeViewer({ scene }: ConceptModeViewerProps) {
  const time = useSceneInteractionStore((s) => s.time);
  const duration = useSceneInteractionStore((s) => s.duration);
  const isPlaying = useSceneInteractionStore((s) => s.isPlaying);
  const hyperplane = useSceneInteractionStore((s) => s.hyperplane);

  const [activePolytope, setActivePolytope] = useState<PolytopeType>('tesseract');
  const [polytopeAngle, setPolytopeAngle] = useState(0);
  const lastTimeRef = useRef<number | null>(null);

  const canvas3DRef = useRef<HTMLCanvasElement | null>(null);
  const canvas4DRef = useRef<HTMLCanvasElement | null>(null);

  const [stats3D, setStats3D] = useState({ minEdge: 2.0, maxEdge: 2.0, ratio: 1.0 });
  const [stats4D, setStats4D] = useState({ minEdge: 1.2, maxEdge: 3.4, ratio: 2.83 });
  const [slicedMeshInfo, setSlicedMeshInfo] = useState<{
    shapeName: string;
    vertexCount: number;
    faceCount: number;
  }>({ shapeName: 'Tetrahedron', vertexCount: 4, faceCount: 4 });

  const isStaticScene = scene ? !is4dScene(scene as unknown as Parameters<typeof is4dScene>[0]) : false;

  const [sceneBounds, setSceneBounds] = useState<{
    wireframeVertices: Array<[number, number, number]>;
    wireframeEdges: Array<[number, number]>;
    primitiveSamplePoints: Array<[number, number, number]>;
    primitiveSampleEdges: Array<[number, number]>;
  } | null>(null);

  // Independent rotation animation tick driven by Play/Pause
  useEffect(() => {
    if (!isPlaying) {
      lastTimeRef.current = null;
      return;
    }

    let animId: number;

    const tick = (now: number) => {
      if (lastTimeRef.current !== null) {
        const dt = Math.min((now - lastTimeRef.current) / 1000, 0.1);
        setPolytopeAngle((prev) => (prev + dt * 1.5) % (Math.PI * 2));
      }
      lastTimeRef.current = now;
      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animId);
      lastTimeRef.current = null;
    };
  }, [isPlaying]);

  useEffect(() => {
    const sceneId = scene?.id;
    if (!sceneId || !isStaticScene) {
      setSceneBounds(null);
      return;
    }
    let cancelled = false;

    async function loadBounds() {
      try {
        const res = await fetchBff(`/api/scenes/${sceneId}/primitives`);
        if (!res.ok) return;

        const data = (await res.json()) as { primitives?: Array<{ mean: [number, number, number, number] }> };
        if (cancelled || !data.primitives || data.primitives.length === 0) return;

        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        let minZ = Infinity, maxZ = -Infinity;

        for (const p of data.primitives) {
          const [x, y, z] = p.mean;
          minX = Math.min(minX, x); maxX = Math.max(maxX, x);
          minY = Math.min(minY, y); maxY = Math.max(maxY, y);
          minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
        }

        const sizeX = (maxX - minX) / 2 || 1;
        const sizeY = (maxY - minY) / 2 || 1;
        const sizeZ = (maxZ - minZ) / 2 || 1;

        const wireframeVertices: Array<[number, number, number]> = [
          [-sizeX, -sizeY, -sizeZ], [sizeX, -sizeY, -sizeZ],
          [-sizeX, sizeY, -sizeZ], [sizeX, sizeY, -sizeZ],
          [-sizeX, -sizeY, sizeZ], [sizeX, -sizeY, sizeZ],
          [-sizeX, sizeY, sizeZ], [sizeX, sizeY, sizeZ],
        ];

        const wireframeEdges: Array<[number, number]> = [
          [0, 1], [2, 3], [4, 5], [6, 7],
          [0, 2], [1, 3], [4, 6], [5, 7],
          [0, 4], [1, 5], [2, 6], [3, 7],
        ];

        const sampled = data.primitives.slice(0, 30).map((p) => [p.mean[0], p.mean[1], p.mean[2]] as [number, number, number]);
        const sampleEdges: Array<[number, number]> = [];
        for (let i = 0; i < sampled.length - 1; i += 2) {
          sampleEdges.push([i, i + 1]);
        }

        setSceneBounds({
          wireframeVertices,
          wireframeEdges,
          primitiveSamplePoints: sampled,
          primitiveSampleEdges: sampleEdges,
        });
      } catch {
        // Fallback
      }
    }

    void loadBounds();

    return () => {
      cancelled = true;
    };
  }, [scene?.id, isStaticScene]);

  useEffect(() => {
    const canvas3D = canvas3DRef.current;
    const canvas4D = canvas4DRef.current;
    if (!canvas3D || !canvas4D) return;

    const ctx3D = canvas3D.getContext('2d');
    const ctx4D = canvas4D.getContext('2d');
    if (!ctx3D || !ctx4D) return;

    const geometry3D = generateCube3DGeometry();

    let geometry4D: PolytopeGeometry4D;
    if (activePolytope === 'simplex5') {
      geometry4D = generateSimplex5Geometry();
    } else if (activePolytope === 'orthoplex16') {
      geometry4D = generateOrthoplex16Geometry();
    } else {
      geometry4D = generateTesseractGeometry();
    }

    const baseTimeAngle = duration > 0 ? (time / duration) * Math.PI * 2 : 0;
    const timeAngle = baseTimeAngle + polytopeAngle;
    const distanceW = 3.2;
    const cameraDistance = 4.5;

    const width = canvas3D.width;
    const height = canvas3D.height;

    // Clear canvases
    ctx3D.clearRect(0, 0, width, height);
    ctx4D.clearRect(0, 0, width, height);

    const isRenderingSceneWireframe = isStaticScene && activePolytope === 'scene_wireframe';

    // Draw background grids
    drawBackground(ctx3D, width, height, '3D Control (Ordinary Space)');
    drawBackground(
      ctx4D,
      width,
      height,
      isRenderingSceneWireframe
        ? `📦 ${scene?.title || 'Static 3D Scene'} (Real 3D Bounding Wireframe)`
        : `✨ ${geometry4D.name} (Hyperplane Shadow)`,
    );

    // 1. Render Left Canvas (Ordinary 3D Reference Cube)
    const projected3D: Array<[number, number]> = [];
    const rotated3DPoints: Array<[number, number, number]> = [];

    for (const v of geometry3D.vertices) {
      const rot = rotatePoint3D(v as [number, number, number], 0.6 + timeAngle * 0.2, 0.35);
      rotated3DPoints.push(rot);
      const scale = 140 / (cameraDistance - rot[2] * 0.4);
      projected3D.push([width / 2 + rot[0] * scale, height / 2 - rot[1] * scale]);
    }

    // Compute 3D edge lengths
    let min3D = Infinity;
    let max3D = -Infinity;
    ctx3D.strokeStyle = 'rgba(100, 149, 237, 0.85)';
    ctx3D.lineWidth = 2;

    for (const [i, j] of geometry3D.edges) {
      const p1 = projected3D[i];
      const p2 = projected3D[j];
      ctx3D.beginPath();
      ctx3D.moveTo(p1[0], p1[1]);
      ctx3D.lineTo(p2[0], p2[1]);
      ctx3D.stroke();

      const r1 = rotated3DPoints[i];
      const r2 = rotated3DPoints[j];
      const dist3D = Math.hypot(r1[0] - r2[0], r1[1] - r2[1], r1[2] - r2[2]);
      min3D = Math.min(min3D, dist3D);
      max3D = Math.max(max3D, dist3D);
    }

    // Draw 3D vertex dots
    ctx3D.fillStyle = '#6495ed';
    for (const [px, py] of projected3D) {
      ctx3D.beginPath();
      ctx3D.arc(px, py, 4, 0, Math.PI * 2);
      ctx3D.fill();
    }

    setStats3D({
      minEdge: Number(min3D.toFixed(3)),
      maxEdge: Number(max3D.toFixed(3)),
      ratio: Number((max3D / min3D).toFixed(2)),
    });

    // 2. Render Right Canvas (Real 3D Bounding Wireframe OR 4D Polytope)
    if (isRenderingSceneWireframe) {
      const staticVerts = sceneBounds ? sceneBounds.wireframeVertices : geometry3D.vertices;
      const staticEdges = sceneBounds ? sceneBounds.wireframeEdges : geometry3D.edges;

      const projectedStatic: Array<[number, number]> = [];

      for (const v of staticVerts) {
        const rot = rotatePoint3D(v as [number, number, number], 0.6 + timeAngle * 0.2, 0.35);
        const scale = 140 / (cameraDistance - rot[2] * 0.4);
        projectedStatic.push([width / 2 + rot[0] * scale, height / 2 - rot[1] * scale]);
      }

      ctx4D.strokeStyle = 'rgba(251, 146, 60, 0.9)'; // Amber outline
      ctx4D.lineWidth = 2.2;

      for (const [i, j] of staticEdges) {
        const p1 = projectedStatic[i];
        const p2 = projectedStatic[j];
        ctx4D.beginPath();
        ctx4D.moveTo(p1[0], p1[1]);
        ctx4D.lineTo(p2[0], p2[1]);
        ctx4D.stroke();
      }

      ctx4D.fillStyle = '#fb923c';
      for (const [px, py] of projectedStatic) {
        ctx4D.beginPath();
        ctx4D.arc(px, py, 4.5, 0, Math.PI * 2);
        ctx4D.fill();
      }

      let minPairwise = Infinity;
      let maxPairwise = -Infinity;

      if (sceneBounds && sceneBounds.primitiveSamplePoints.length > 1) {
        const samplePts = sceneBounds.primitiveSamplePoints;
        const sampleEdges = sceneBounds.primitiveSampleEdges;
        const rotatedPts = samplePts.map((pt) => rotatePoint3D(pt, 0.6 + timeAngle * 0.2, 0.35));

        for (const [i, j] of sampleEdges) {
          const p1 = rotatedPts[i];
          const p2 = rotatedPts[j];
          const d = Math.hypot(p1[0] - p2[0], p1[1] - p2[1], p1[2] - p2[2]);
          minPairwise = Math.min(minPairwise, d);
          maxPairwise = Math.max(maxPairwise, d);
        }
      } else {
        minPairwise = min3D;
        maxPairwise = max3D;
      }

      setStats4D({
        minEdge: Number(minPairwise.toFixed(3)),
        maxEdge: Number(maxPairwise.toFixed(3)),
        ratio: 1.0,
      });
    } else {
      // Sprint M5: Calculate live exact 3D cross-sectional mesh via slicePolytopeHyperplane
      const planeOffset = (Math.sin(timeAngle) + 1.0) * (activePolytope === 'tesseract' ? 2.0 : 1.0);
      const slicePlane: Hyperplane4D = {
        normal: [1, 1, 1, 1],
        offset: planeOffset,
      };

      const slicedMesh = slicePolytopeHyperplane(geometry4D, slicePlane);
      setSlicedMeshInfo({
        shapeName: slicedMesh.shapeName,
        vertexCount: slicedMesh.vertexCount,
        faceCount: slicedMesh.faceCount,
      });

      // Render 4D Wireframe Shadow
      const projected4D: Array<[number, number]> = [];
      const projected3DPointsFrom4D: Array<[number, number, number]> = [];

      for (const v of geometry4D.vertices) {
        const rot4 = rotatePoint4D(v, hyperplane.xw, hyperplane.yw, hyperplane.zw, timeAngle);

        const wScale = distanceW / (distanceW - rot4[3] * 0.6);
        const p3x = rot4[0] * wScale;
        const p3y = rot4[1] * wScale;
        const p3z = rot4[2] * wScale;

        projected3DPointsFrom4D.push([p3x, p3y, p3z]);

        const rot3 = rotatePoint3D([p3x, p3y, p3z], 0.6, 0.35);
        const screenScale = 120 / (cameraDistance - rot3[2] * 0.3);
        projected4D.push([width / 2 + rot3[0] * screenScale, height / 2 - rot3[1] * screenScale]);
      }

      let min4D = Infinity;
      let max4D = -Infinity;

      for (let k = 0; k < geometry4D.edges.length; k++) {
        const [i, j] = geometry4D.edges[k];
        const p1 = projected4D[i];
        const p2 = projected4D[j];

        const r1 = projected3DPointsFrom4D[i];
        const r2 = projected3DPointsFrom4D[j];
        const dist4D = Math.hypot(r1[0] - r2[0], r1[1] - r2[1], r1[2] - r2[2]);
        min4D = Math.min(min4D, dist4D);
        max4D = Math.max(max4D, dist4D);

        const isInner = v4IsInner(geometry4D.vertices[i], geometry4D.vertices[j]);
        ctx4D.strokeStyle = isInner ? 'rgba(52, 211, 153, 0.4)' : 'rgba(168, 85, 247, 0.4)';
        ctx4D.lineWidth = isInner ? 1.5 : 1.2;

        ctx4D.beginPath();
        ctx4D.moveTo(p1[0], p1[1]);
        ctx4D.lineTo(p2[0], p2[1]);
        ctx4D.stroke();
      }

      // Sprint M5: Overlay the exact 3D cross-sectional face polygons
      if (slicedMesh.faces.length > 0) {
        ctx4D.strokeStyle = '#34d399';
        ctx4D.lineWidth = 2.5;
        ctx4D.fillStyle = 'rgba(52, 211, 153, 0.15)';

        for (const face of slicedMesh.faces) {
          if (face.length < 3) continue;
          ctx4D.beginPath();

          for (let fIdx = 0; fIdx < face.length; fIdx++) {
            const p3d = slicedMesh.vertices3D[face[fIdx]];
            const rot3 = rotatePoint3D(p3d, 0.6, 0.35);
            const scale = 120 / (cameraDistance - rot3[2] * 0.3);
            const sx = width / 2 + rot3[0] * scale;
            const sy = height / 2 - rot3[1] * scale;

            if (fIdx === 0) ctx4D.moveTo(sx, sy);
            else ctx4D.lineTo(sx, sy);
          }
          ctx4D.closePath();
          ctx4D.fill();
          ctx4D.stroke();
        }
      }

      for (let i = 0; i < projected4D.length; i++) {
        const [px, py] = projected4D[i];
        ctx4D.fillStyle = i < geometry4D.vertices.length / 2 ? '#34d399' : '#a855f7';
        ctx4D.beginPath();
        ctx4D.arc(px, py, 3.5, 0, Math.PI * 2);
        ctx4D.fill();
      }

      const safeMin4D = Math.max(0.01, min4D);
      setStats4D({
        minEdge: Number(min4D.toFixed(3)),
        maxEdge: Number(max4D.toFixed(3)),
        ratio: Number((max4D / safeMin4D).toFixed(2)),
      });
    }
  }, [time, duration, hyperplane, activePolytope, isStaticScene, scene, sceneBounds, polytopeAngle]);

  return (
    <div className="space-y-4">
      {/* 4D Polytope Selector Picker */}
      <div className="flex flex-col gap-2 rounded-xl border border-surface-border bg-surface-raised p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted">
            Select 4D Polytope Geometry:
          </span>
          {isStaticScene ? (
            <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-300 border border-amber-500/30">
              Press Play to animate
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-1 rounded-lg border border-surface-border bg-surface p-1">
          <button
            type="button"
            onClick={() => setActivePolytope('tesseract')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
              activePolytope === 'tesseract'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-muted hover:text-foreground'
            }`}
          >
            Tesseract (8-cell)
          </button>
          <button
            type="button"
            onClick={() => setActivePolytope('simplex5')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
              activePolytope === 'simplex5'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-muted hover:text-foreground'
            }`}
          >
            5-Cell (4-simplex)
          </button>
          <button
            type="button"
            onClick={() => setActivePolytope('orthoplex16')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
              activePolytope === 'orthoplex16'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-muted hover:text-foreground'
            }`}
          >
            16-Cell (4-orthoplex)
          </button>
          {isStaticScene ? (
            <button
              type="button"
              onClick={() => setActivePolytope('scene_wireframe')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                activePolytope === 'scene_wireframe'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              Scene Wireframe
            </button>
          ) : null}
        </div>
      </div>

      {/* Sprint M5: Live Sliced Mesh HUD Readout */}
      {activePolytope !== 'scene_wireframe' ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-500/30 bg-emerald-950/20 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-xs font-bold text-emerald-300 border border-emerald-500/40">
              Sprint M5 Cross-Section
            </span>
            <span className="text-xs font-semibold text-foreground">
              {slicedMeshInfo.shapeName}
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono text-emerald-300">
            <span>Vertices: <strong>{slicedMeshInfo.vertexCount}</strong></span>
            <span>Faces: <strong>{slicedMeshInfo.faceCount}</strong></span>
          </div>
        </div>
      ) : null}

      {/* Side-by-Side Canvas Display */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Left Panel: Ordinary 3D Control */}
        <div className="flex flex-col rounded-xl border border-surface-border bg-surface-raised p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
              Ordinary 3D Cube (Control)
            </h3>
            <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] text-blue-400 border border-blue-500/30">
              Rigid 3D Solid
            </span>
          </div>

          <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-surface border border-surface-border">
            <canvas
              ref={canvas3DRef}
              width={480}
              height={320}
              className="h-full w-full object-contain"
            />
          </div>

          <div className="mt-3 flex items-center justify-between text-xs border-t border-surface-border pt-2 font-mono">
            <span className="text-muted">Edge Ratio:</span>
            <span className="font-semibold text-blue-400">{stats3D.ratio}x (Invariant)</span>
          </div>
        </div>

        {/* Right Panel: 4D Polytope / Cross-Section Mesh */}
        <div className="flex flex-col rounded-xl border border-surface-border bg-surface-raised p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
              {activePolytope === 'scene_wireframe'
                ? 'Static 3D Bounding Box'
                : `${activePolytope.toUpperCase()} + 3D Cross-Section`}
            </h3>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] border ${
                isStaticScene && activePolytope === 'scene_wireframe'
                  ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                  : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
              }`}
            >
              {isStaticScene && activePolytope === 'scene_wireframe'
                ? 'Static 3D Rigidity (1.00x)'
                : 'Dynamic 4D Hyperplane'}
            </span>
          </div>

          <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-surface border border-surface-border">
            <canvas
              ref={canvas4DRef}
              width={480}
              height={320}
              className="h-full w-full object-contain"
            />
          </div>

          <div className="mt-3 flex items-center justify-between text-xs border-t border-surface-border pt-2 font-mono">
            <span className="text-muted">Shadow Stretch Ratio:</span>
            <span
              className={`font-semibold ${
                stats4D.ratio === 1.0 ? 'text-amber-300' : 'text-emerald-300'
              }`}
            >
              {stats4D.ratio}x {stats4D.ratio === 1.0 ? '(Rigid 3D)' : '(4D Perspective)'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function rotatePoint3D(
  p: [number, number, number],
  azimuth: number,
  elevation: number,
): [number, number, number] {
  const [x, y, z] = p;
  const cosY = Math.cos(azimuth), sinY = Math.sin(azimuth);
  const rx = x * cosY + z * sinY;
  const rz = -x * sinY + z * cosY;

  const cosX = Math.cos(elevation), sinX = Math.sin(elevation);
  const ry = y * cosX - rz * sinX;
  const rz2 = y * sinX + rz * cosX;

  return [rx, ry, rz2];
}

function rotatePoint4D(
  point: [number, number, number, number],
  xw: number,
  yw: number,
  zw: number,
  timeAngle: number,
): [number, number, number, number] {
  let [x, y, z, w] = point;

  // XW Rotation
  const cXW = Math.cos(xw + timeAngle * 0.3), sXW = Math.sin(xw + timeAngle * 0.3);
  const rx = x * cXW - w * sXW;
  const rw1 = x * sXW + w * cXW;
  x = rx; w = rw1;

  // YW Rotation
  const cYW = Math.cos(yw), sYW = Math.sin(yw);
  const ry = y * cYW - w * sYW;
  const rw2 = y * sYW + w * cYW;
  y = ry; w = rw2;

  // ZW Rotation
  const cZW = Math.cos(zw), sZW = Math.sin(zw);
  const rz = z * cZW - w * sZW;
  const rw3 = z * sZW + w * cZW;
  z = rz; w = rw3;

  return [x, y, z, w];
}

function v4IsInner(p1: [number, number, number, number], p2: [number, number, number, number]) {
  return p1[3] !== p2[3];
}

function drawBackground(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  title: string,
) {
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
  ctx.lineWidth = 1;
  for (let x = 0; x < w; x += 30) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
  }
  for (let y = 0; y < h; y += 30) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }

  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.font = '11px sans-serif';
  ctx.fillText(title, 12, 20);
}
