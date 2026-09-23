'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  compute4DEscapePoint,
  constrain2DDot,
  constrain3DBall,
  project4DPuzzlePoint,
  type Point2D,
  type Point3D,
  type Point4D,
} from '@4th-dimension/engine';

export function ImpossibleEscapeClient() {
  const [level, setLevel] = useState<1 | 2>(1);

  return (
    <div className="flex h-full min-h-[calc(100vh-8rem)] flex-col gap-6 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col gap-2 border-b border-surface-border pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-accent/20 px-2.5 py-0.5 text-xs font-semibold text-accent border border-accent/40">
              Interactive Onboarding Puzzle
            </span>
            <span className="text-xs text-muted">Level {level} of 2</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-foreground">
            {level === 1 ? 'Level 1: The 2D Flatland Trap' : 'Level 2: The Sealed 3D Chamber'}
          </h1>
          <p className="mt-1 text-xs text-muted">
            {level === 1
              ? 'Try to drag the dot out of the closed square. Can you escape?'
              : 'Try to drag the ball out of the 6-sided sealed 3D box.'}
          </p>
        </div>

        {/* Level Switcher */}
        <div className="flex items-center gap-2 rounded-lg border border-surface-border bg-surface p-1">
          <button
            type="button"
            onClick={() => setLevel(1)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
              level === 1
                ? 'bg-accent/20 text-accent font-semibold'
                : 'text-muted hover:text-foreground'
            }`}
          >
            Level 1 (2D)
          </button>
          <button
            type="button"
            onClick={() => setLevel(2)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
              level === 2
                ? 'bg-accent/20 text-accent font-semibold'
                : 'text-muted hover:text-foreground'
            }`}
          >
            Level 2 (3D/4D)
          </button>
        </div>
      </div>

      {/* Level Viewports */}
      {level === 1 ? (
        <Level1Escape2D onComplete={() => setLevel(2)} />
      ) : (
        <Level2Escape3D />
      )}
    </div>
  );
}

function Level1Escape2D({ onComplete }: { onComplete: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [dotPos, setDotPos] = useState<Point2D>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);
  const [hasAttempted, setHasAttempted] = useState(false);
  const [showStuckPrompt, setShowStuckPrompt] = useState(false);
  const [isEscaping, setIsEscaping] = useState(false);
  const [isEscaped, setIsEscaped] = useState(false);
  const [escapeProgress, setEscapeProgress] = useState(0);

  const dragStartRef = useRef<Point2D | null>(null);

  // Auto-show stuck prompt after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowStuckPrompt(true);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  // Handle pointer drag
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isEscaping || isEscaped) return;
    setIsDragging(true);
    setHasAttempted(true);
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left - rect.width / 2;
    const clickY = e.clientY - rect.top - rect.height / 2;
    dragStartRef.current = { x: clickX, y: clickY };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDragging || isEscaping || isEscaped) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const rawX = e.clientX - rect.left - rect.width / 2;
    const rawY = e.clientY - rect.top - rect.height / 2;

    // Apply 2D unescapable constraint logic
    const constrained = constrain2DDot({ x: rawX, y: rawY }, 60);
    setDotPos(constrained);

    if (Math.abs(rawX) > 60 || Math.abs(rawY) > 60) {
      setAttemptCount((c) => c + 1);
      if (attemptCount >= 2) setShowStuckPrompt(true);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Fallback
    }
  };

  // Perform 3D Lift Escape
  const handleLiftTo3D = () => {
    setIsEscaping(true);
    setShowStuckPrompt(false);

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      setDotPos({ x: 0, y: -110 });
      setIsEscaping(false);
      setIsEscaped(true);
      return;
    }

    const duration = 2000;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      setEscapeProgress(progress);

      if (progress <= 0.4) {
        // Lift up
        setDotPos({ x: 0, y: 0 });
      } else if (progress <= 0.7) {
        // Move over top wall
        const p2 = (progress - 0.4) / 0.3;
        setDotPos({ x: 0, y: -110 * p2 });
      } else {
        // Drop down outside wall
        setDotPos({ x: 0, y: -110 });
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setIsEscaping(false);
        setIsEscaped(true);
      }
    };

    requestAnimationFrame(animate);
  };

  // Canvas rendering for Level 1
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;

    ctx.clearRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 30) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y < h; y += 30) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    // Closed 2D Square Box Walls (75px half-width)
    const boxHalf = 75;
    ctx.strokeStyle = isEscaped ? 'rgba(52, 211, 153, 0.8)' : 'rgba(244, 63, 94, 0.85)';
    ctx.lineWidth = 4;
    ctx.strokeRect(cx - boxHalf, cy - boxHalf, boxHalf * 2, boxHalf * 2);

    ctx.fillStyle = isEscaped ? 'rgba(52, 211, 153, 0.08)' : 'rgba(244, 63, 94, 0.08)';
    ctx.fillRect(cx - boxHalf, cy - boxHalf, boxHalf * 2, boxHalf * 2);

    // 2D Shadow effect during 3D height lift
    let liftScale = 1.0;
    let shadowAlpha = 0;
    if (isEscaping) {
      if (escapeProgress <= 0.4) {
        liftScale = 1.0 + (escapeProgress / 0.4) * 0.8;
        shadowAlpha = (escapeProgress / 0.4) * 0.5;
      } else if (escapeProgress <= 0.7) {
        liftScale = 1.8;
        shadowAlpha = 0.5;
      } else {
        const p3 = (escapeProgress - 0.7) / 0.3;
        liftScale = 1.8 - p3 * 0.8;
        shadowAlpha = (1 - p3) * 0.5;
      }
    }

    const dotX = cx + dotPos.x;
    const dotY = cy + dotPos.y;

    // Draw shadow underneath when lifted in 3D
    if (shadowAlpha > 0) {
      ctx.fillStyle = `rgba(0, 0, 0, ${shadowAlpha})`;
      ctx.beginPath();
      ctx.ellipse(dotX, cy + (dotPos.y > -50 ? 0 : dotPos.y + 40), 12, 6, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw Dot
    ctx.fillStyle = isEscaped ? '#34d399' : '#38bdf8';
    ctx.beginPath();
    ctx.arc(dotX, dotY, 10 * liftScale, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Text labels on canvas
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '12px sans-serif';
    ctx.fillText('2D Flatland Square (Solid Walls)', 15, 25);

    if (isEscaping) {
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('LIFTING INTO 3RD DIMENSION (z > 0)...', cx - 120, cy + boxHalf + 35);
    }
  }, [dotPos, isEscaping, isEscaped, escapeProgress]);

  return (
    <div className="flex flex-col gap-4">
      <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-surface-border bg-canvas shadow-inner-glow">
        <canvas
          ref={canvasRef}
          width={720}
          height={400}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className="h-full w-full cursor-grab active:cursor-grabbing touch-none object-contain"
        />

        {/* Drag Hint overlay */}
        {!hasAttempted && !isEscaping && !isEscaped ? (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 rounded-full bg-surface/90 border border-accent/40 px-3 py-1 text-xs text-accent backdrop-blur-sm pointer-events-none animate-pulse">
            Drag the blue dot to try escaping the square
          </div>
        ) : null}
      </div>

      {/* Stuck Prompt Callout */}
      {showStuckPrompt && !isEscaping && !isEscaped ? (
        <div className="flex flex-col gap-3 rounded-xl border border-amber-500/40 bg-amber-950/20 p-4 transition-all">
          <div className="flex items-center gap-2">
            <span className="text-amber-400 font-semibold text-sm">Stuck in 2D Space?</span>
          </div>
          <p className="text-xs text-foreground/90 leading-relaxed">
            Notice how no 2D drag can pass through the walls? In 2D, the walls enclose all possible directions of motion (x and y).
          </p>
          <button
            type="button"
            onClick={handleLiftTo3D}
            className="self-start rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-background transition hover:bg-accent-hover shadow-glow-x"
          >
            Lift into the 3rd dimension -&gt;
          </button>
        </div>
      ) : null}

      {/* Completion Caption */}
      {isEscaped ? (
        <div className="flex flex-col gap-3 rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-4 animate-in fade-in">
          <p className="text-xs text-emerald-300 font-medium leading-relaxed">
            <strong>To a 2D creature, this would look like magic</strong> - you didn&apos;t go around the wall, you used a direction (z) it doesn&apos;t know exists. That&apos;s the whole idea. Now let&apos;s try it one dimension up.
          </p>
          <button
            type="button"
            onClick={onComplete}
            className="self-start rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-background transition hover:bg-emerald-400 shadow-md"
          >
            Continue to Level 2 -&gt;
          </button>
        </div>
      ) : null}
    </div>
  );
}

function Level2Escape3D() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [ballPos, setBallPos] = useState<Point3D>({ x: 0, y: 0, z: 0 });
  const [ballW, setBallW] = useState(0);
  const [azimuth, setAzimuth] = useState(0.6);
  const [elevation, setElevation] = useState(0.35);
  const [isDraggingBall, setIsDraggingBall] = useState(false);
  const [isOrbiting, setIsOrbiting] = useState(false);
  const [hasAttempted, setHasAttempted] = useState(false);
  const [showStuckPrompt, setShowStuckPrompt] = useState(false);
  const [isEscaping, setIsEscaping] = useState(false);
  const [isEscaped, setIsEscaped] = useState(false);

  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowStuckPrompt(true);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isEscaping || isEscaped) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    lastPointerRef.current = { x: e.clientX, y: e.clientY };
    setHasAttempted(true);

    const midX = rect.width / 2;
    const midY = rect.height / 2;
    const distToCenter = Math.hypot(x - midX, y - midY);

    if (distToCenter < 40) {
      setIsDraggingBall(true);
    } else {
      setIsOrbiting(true);
    }
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!lastPointerRef.current || isEscaping || isEscaped) return;
    const dx = e.clientX - lastPointerRef.current.x;
    const dy = e.clientY - lastPointerRef.current.y;
    lastPointerRef.current = { x: e.clientX, y: e.clientY };

    if (isDraggingBall) {
      const attempted: Point3D = {
        x: ballPos.x + dx * 0.005,
        y: ballPos.y - dy * 0.005,
        z: ballPos.z,
      };
      const constrained = constrain3DBall(attempted, 0.65);
      setBallPos(constrained);
      if (Math.abs(attempted.x) > 0.65 || Math.abs(attempted.y) > 0.65) {
        setShowStuckPrompt(true);
      }
    } else if (isOrbiting) {
      setAzimuth((a) => a + dx * 0.005);
      setElevation((el) => Math.max(-1.2, Math.min(1.2, el + dy * 0.005)));
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setIsDraggingBall(false);
    setIsOrbiting(false);
    lastPointerRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Fallback
    }
  };

  // Perform Real 4D Escape using compute4DEscapePoint & project4DPuzzlePoint
  const handleStepInto4D = () => {
    setIsEscaping(true);
    setShowStuckPrompt(false);

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      const final4D = compute4DEscapePoint(1.0, ballPos, { x: 1.8, y: 1.2, z: 0.0 });
      setBallPos({ x: final4D[0], y: final4D[1], z: final4D[2] });
      setBallW(final4D[3]);
      setIsEscaping(false);
      setIsEscaped(true);
      return;
    }

    const duration = 3200;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);

      const current4D: Point4D = compute4DEscapePoint(
        progress,
        ballPos,
        { x: 1.8, y: 1.2, z: 0.0 },
        2.5,
      );

      setBallPos({ x: current4D[0], y: current4D[1], z: current4D[2] });
      setBallW(current4D[3]);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setIsEscaping(false);
        setIsEscaped(true);
      }
    };

    requestAnimationFrame(animate);
  };

  // Canvas 3D Box & Ghost/Echo Chamber 4D Projection Rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 30) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y < h; y += 30) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    // 3D Box Vertices ([-1, -1, -1] to [1, 1, 1] scaled to 0.85)
    const boxSize = 0.85;
    const vertices3D: Array<[number, number, number]> = [
      [-boxSize, -boxSize, -boxSize], [boxSize, -boxSize, -boxSize],
      [-boxSize, boxSize, -boxSize], [boxSize, boxSize, -boxSize],
      [-boxSize, -boxSize, boxSize], [boxSize, -boxSize, boxSize],
      [-boxSize, boxSize, boxSize], [boxSize, boxSize, boxSize],
    ];

    const edges3D = [
      [0, 1], [2, 3], [4, 5], [6, 7],
      [0, 2], [1, 3], [4, 6], [5, 7],
      [0, 4], [1, 5], [2, 6], [3, 7],
    ];

    // Project Main 3D Box Vertices (w = 0)
    const projectedBox: Array<[number, number]> = [];
    const cameraDist = 4.5;

    for (const [vx, vy, vz] of vertices3D) {
      const cosY = Math.cos(azimuth);
      const sinY = Math.sin(azimuth);
      const rx = vx * cosY + vz * sinY;
      const rz = -vx * sinY + vz * cosY;

      const cosX = Math.cos(elevation);
      const sinX = Math.sin(elevation);
      const ry = vy * cosX - rz * sinX;
      const rz2 = vy * sinX + rz * cosX;

      const scale = 120 / (cameraDist - rz2 * 0.3);
      projectedBox.push([w / 2 - 30 + rx * scale, h / 2 + ry * scale]);
    }

    // Ghost / Echo Chamber offset for w > 0 slice representation
    const echoOffsetX = 110;
    const echoOffsetY = -45;
    const projectedEchoBox: Array<[number, number]> = projectedBox.map(([px, py]) => [
      px + echoOffsetX,
      py + echoOffsetY,
    ]);

    // 1. Draw 4D Hyper-edges (connecting lines between Main Box and Ghost/Echo Box)
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.22)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 4]);
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      ctx.moveTo(projectedBox[i][0], projectedBox[i][1]);
      ctx.lineTo(projectedEchoBox[i][0], projectedEchoBox[i][1]);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // 2. Draw Ghost / Echo Chamber (Neighboring W-slice: w > 0)
    ctx.strokeStyle = ballW > 0 ? 'rgba(192, 132, 252, 0.65)' : 'rgba(168, 85, 247, 0.3)';
    ctx.lineWidth = ballW > 0 ? 2 : 1.5;
    ctx.setLineDash([4, 4]);

    for (const [i, j] of edges3D) {
      const p1 = projectedEchoBox[i];
      const p2 = projectedEchoBox[j];
      ctx.beginPath();
      ctx.moveTo(p1[0], p1[1]);
      ctx.lineTo(p2[0], p2[1]);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // 3. Draw Main Solid 3D Box Edges (w = 0)
    ctx.strokeStyle = isEscaped ? 'rgba(52, 211, 153, 0.85)' : 'rgba(244, 63, 94, 0.85)';
    ctx.lineWidth = 2.5;

    for (const [i, j] of edges3D) {
      const p1 = projectedBox[i];
      const p2 = projectedBox[j];
      ctx.beginPath();
      ctx.moveTo(p1[0], p1[1]);
      ctx.lineTo(p2[0], p2[1]);
      ctx.stroke();
    }

    // 4. Calculate Ball Screen Position shifting along W-axis towards Echo Chamber
    const p4: Point4D = [ballPos.x, ballPos.y, ballPos.z, 0]; // Base 3D projection
    const proj = project4DPuzzlePoint(p4, azimuth, elevation, w, h);
    // Shift screen center X by -30 to match main box center offset
    const baseCenterX = proj.screenX - 30;
    const baseCenterY = proj.screenY;

    // Shift ball visually towards Echo Chamber according to live w-coordinate
    const maxW = 2.5;
    const wFactor = Math.min(1.0, Math.max(0, ballW / maxW));
    const ballScreenX = baseCenterX + wFactor * echoOffsetX;
    const ballScreenY = baseCenterY + wFactor * echoOffsetY;

    // Draw Ball Shadow in 3D
    ctx.fillStyle = `rgba(0, 0, 0, ${0.4 * (1 - wFactor * 0.5)})`;
    ctx.beginPath();
    ctx.ellipse(ballScreenX, ballScreenY + 20, proj.radius * 0.8, proj.radius * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Draw Ball
    const ballColor = isEscaped
      ? '#34d399'
      : ballW > 0
      ? '#c084fc'
      : '#38bdf8';

    ctx.fillStyle = ballColor;
    ctx.beginPath();
    ctx.arc(ballScreenX, ballScreenY, proj.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 5. Canvas Text Labels & Annotations
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '11px sans-serif';
    ctx.fillText('Solid Sealed 3D Box (w = 0)', 15, 25);

    ctx.fillStyle = ballW > 0 ? 'rgba(216, 180, 254, 0.9)' : 'rgba(168, 85, 247, 0.55)';
    ctx.fillText('Ghost Echo Chamber (w > 0 Slice)', 15 + echoOffsetX, 25 + echoOffsetY + 30);

    // 6. Live W-Position HUD Readout
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(w - 235, 12, 220, 44);
    ctx.strokeStyle = ballW > 0 ? '#a855f7' : isEscaped ? '#34d399' : 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(w - 235, 12, 220, 44);

    ctx.fillStyle = ballW > 0 ? '#c084fc' : isEscaped ? '#34d399' : '#94a3b8';
    ctx.font = 'bold 13px monospace';
    ctx.fillText(`W-POSITION: ${ballW >= 0 ? '+' : ''}${ballW.toFixed(2)}`, w - 222, 31);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.font = '10px sans-serif';
    ctx.fillText(
      ballW > 0
        ? 'STATUS: STEPPED INTO 4D ECHO SLICE'
        : isEscaped
        ? 'STATUS: ESCAPED OUTSIDE BOX'
        : 'STATUS: TRAPPED IN 3D CHAMBER',
      w - 222,
      47
    );
  }, [ballPos, ballW, azimuth, elevation, isEscaped]);

  return (
    <div className="flex flex-col gap-4">
      <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-surface-border bg-canvas shadow-inner-glow">
        <canvas
          ref={canvasRef}
          width={720}
          height={400}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className="h-full w-full cursor-grab active:cursor-grabbing touch-none object-contain"
        />

        {!hasAttempted && !isEscaping && !isEscaped ? (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 rounded-full bg-surface/90 border border-accent/40 px-3 py-1 text-xs text-accent backdrop-blur-sm pointer-events-none animate-pulse">
            Drag center ball or drag background to orbit 3D box
          </div>
        ) : null}
      </div>

      {/* Stuck Prompt Callout */}
      {showStuckPrompt && !isEscaping && !isEscaped ? (
        <div className="flex flex-col gap-3 rounded-xl border border-amber-500/40 bg-amber-950/20 p-4 transition-all">
          <div className="flex items-center gap-2">
            <span className="text-amber-400 font-semibold text-sm">Trapped in 3D Space?</span>
          </div>
          <p className="text-xs text-foreground/90 leading-relaxed">
            No 3D direction (x, y, z) can move the ball past the sealed walls. To escape, we must move along a 4th direction perpendicular to all three.
          </p>
          <button
            type="button"
            onClick={handleStepInto4D}
            className="self-start rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-background transition hover:bg-emerald-400 shadow-md"
          >
            Step sideways into the 4th dimension -&gt;
          </button>
        </div>
      ) : null}

      {/* Completion & CTA */}
      {isEscaped ? (
        <div className="flex flex-col gap-4 rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-4 animate-in fade-in">
          <p className="text-xs text-emerald-300 font-medium leading-relaxed">
            <strong>The faint &apos;echo&apos; box represents a neighboring position along the 4th direction</strong> — the ball briefly moved through it, then came back into our 3D space outside the wall. The W-Position counter proves it: that&apos;s a real coordinate changing, not a disappearing trick.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/viewer?mode=concept"
              className="rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-background transition hover:bg-emerald-400 shadow-md"
            >
              See it in Concept Mode -&gt;
            </Link>
            <Link
              href="/scenes"
              className="rounded-lg border border-surface-border bg-surface px-4 py-2 text-xs font-medium text-foreground transition hover:border-accent hover:bg-surface-raised"
            >
              Explore real 4D scenes -&gt;
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
