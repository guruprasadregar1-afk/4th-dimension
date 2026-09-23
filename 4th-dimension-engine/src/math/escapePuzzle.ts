export interface Point2D {
  x: number;
  y: number;
}

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export type Point4D = [number, number, number, number];

/**
 * Level 1 Constraint: Constrains 2D dot position so it cannot escape outside a closed 2D box.
 */
export function constrain2DDot(pos: Point2D, halfSize = 70): Point2D {
  return {
    x: Math.max(-halfSize, Math.min(halfSize, pos.x)),
    y: Math.max(-halfSize, Math.min(halfSize, pos.y)),
  };
}

/**
 * Level 2 Constraint: Constrains 3D ball position so it cannot escape outside a closed 3D box.
 */
export function constrain3DBall(pos: Point3D, halfSize = 0.75): Point3D {
  return {
    x: Math.max(-halfSize, Math.min(halfSize, pos.x)),
    y: Math.max(-halfSize, Math.min(halfSize, pos.y)),
    z: Math.max(-halfSize, Math.min(halfSize, pos.z)),
  };
}

/**
 * Level 2 4D Escape: Computes the 4D coordinate [x, y, z, w] during the 4D escape animation step.
 * Uses real 4D coordinate transformation and w-translation.
 */
export function compute4DEscapePoint(
  progress: number,
  startPos: Point3D = { x: 0, y: 0, z: 0 },
  targetPos: Point3D = { x: 2.0, y: 1.5, z: 0.0 },
  maxW = 2.5,
): Point4D {
  const t = Math.max(0, Math.min(1, progress));

  let w = 0;
  let x = startPos.x;
  let y = startPos.y;
  let z = startPos.z;

  if (t <= 0.35) {
    // Phase 1: Translate into 4th dimension (w increases 0 -> maxW)
    const p1 = t / 0.35;
    w = maxW * p1;
    x = startPos.x;
    y = startPos.y;
    z = startPos.z;
  } else if (t <= 0.65) {
    // Phase 2: Translate spatial coordinates (x,y,z) sideways outside 3D box while in 4D space (w = maxW)
    const p2 = (t - 0.35) / 0.3;
    w = maxW;
    x = startPos.x + (targetPos.x - startPos.x) * p2;
    y = startPos.y + (targetPos.y - startPos.y) * p2;
    z = startPos.z + (targetPos.z - startPos.z) * p2;
  } else {
    // Phase 3: Step back down from 4th dimension (w decreases maxW -> 0) outside 3D box
    const p3 = (t - 0.65) / 0.35;
    w = maxW * (1 - p3);
    x = targetPos.x;
    y = targetPos.y;
    z = targetPos.z;
  }

  return [x, y, z, w];
}

/**
 * Projects a 4D point [x, y, z, w] to screen space using 4D perspective w-projection and 3D camera rotation.
 */
export function project4DPuzzlePoint(
  point4D: Point4D,
  azimuth: number,
  elevation: number,
  canvasWidth: number,
  canvasHeight: number,
  distanceW = 3.2,
  cameraDistance = 4.5,
): {
  screenX: number;
  screenY: number;
  wScale: number;
  alpha: number;
  radius: number;
} {
  const [x, y, z, w] = point4D;

  // 1. 4D to 3D perspective projection across w-axis (hyperplane slice scaling)
  const wScale = distanceW / (distanceW - w * 0.6);
  const p3x = x * wScale;
  const p3y = y * wScale;
  const p3z = z * wScale;

  // 2. 3D camera rotation
  const cosY = Math.cos(azimuth);
  const sinY = Math.sin(azimuth);
  const rx = p3x * cosY + p3z * sinY;
  const rz = -p3x * sinY + p3z * cosY;

  const cosX = Math.cos(elevation);
  const sinX = Math.sin(elevation);
  const ry = p3y * cosX - rz * sinX;
  const rz2 = p3y * sinX + rz * cosX;

  // 3. 3D to 2D perspective projection
  const screenScale = 120 / (cameraDistance - rz2 * 0.3);
  const screenX = canvasWidth / 2 + rx * screenScale;
  const screenY = canvasHeight / 2 - ry * screenScale;

  // Alpha fade effect during 4D displacement (hyperplane slice transition)
  const alpha = Math.max(0.2, Math.min(1.0, 1.0 - Math.abs(w) * 0.25));
  const radius = Math.max(4, Math.min(30, 10 * wScale));

  return { screenX, screenY, wScale, alpha, radius };
}
