import type { Gaussian3D } from './gaussian4d';

export interface Splat2D {
  center: [number, number];
  conic: [number, number, number];
  color: [number, number, number, number];
  alpha: number;
  depth: number;
  radius: number;
}

export interface CameraParams {
  viewMatrix: Float32Array;
  projectionMatrix: Float32Array;
  viewport: [number, number];
}

/**
 * Project 3D Gaussians to 2D screen-space splats (EWA approximation).
 */
export function projectSplats(
  splats: Gaussian3D[],
  camera: CameraParams,
): Splat2D[] {
  const viewProj = multiply4x4(
    camera.projectionMatrix,
    camera.viewMatrix,
  );
  const result: Splat2D[] = [];

  for (const splat of splats) {
    const projected = projectSingle(splat, viewProj, camera.viewport);
    if (projected) {
      result.push(projected);
    }
  }

  return result;
}

function projectSingle(
  splat: Gaussian3D,
  viewProj: Float32Array,
  viewport: [number, number],
): Splat2D | null {
  const [x, y, z] = splat.mean;
  const clip = transformPoint(viewProj, x, y, z);

  if (clip[3] <= 0.01) {
    return null;
  }

  const ndcX = clip[0] / clip[3];
  const ndcY = clip[1] / clip[3];
  const depth = clip[2] / clip[3];

  if (ndcX < -1.2 || ndcX > 1.2 || ndcY < -1.2 || ndcY > 1.2) {
    return null;
  }

  const jacobian = buildJacobian(viewProj, x, y, z, viewport);
  const cov2d = projectCovariance3D(splat.covariance, jacobian);

  const conic = invert2x2(cov2d);
  if (!conic) {
    return null;
  }

  // Calculate max eigenvalue of 2D projected covariance matrix to determine 3-sigma bounding extent in pixels
  const [a, b, c] = cov2d;
  const mid = 0.5 * (a + c);
  const term = Math.sqrt(Math.max(0, 0.25 * (a - c) * (a - c) + b * b));
  const lambdaMax = Math.max(0.1, mid + term);
  const radius = Math.min(1024, Math.max(1.0, 3.0 * Math.sqrt(lambdaMax)));

  return {
    center: [ndcX, ndcY],
    conic,
    color: splat.color,
    alpha: Math.min(1, splat.alpha),
    depth,
    radius,
  };
}

function buildJacobian(
  viewProj: Float32Array,
  x: number,
  y: number,
  z: number,
  viewport: [number, number],
): Float32Array {
  const eps = 0.01;
  const base = transformPoint(viewProj, x, y, z);
  const dx = transformPoint(viewProj, x + eps, y, z);
  const dy = transformPoint(viewProj, x, y + eps, z);
  const dz = transformPoint(viewProj, x, y, z + eps);

  const w = base[3] || 1;
  const j = new Float32Array(6);

  j[0] = ((dx[0] / dx[3] - base[0] / w) / eps) * viewport[0] * 0.5;
  j[1] = ((dy[0] / dy[3] - base[0] / w) / eps) * viewport[0] * 0.5;
  j[2] = ((dx[1] / dx[3] - base[1] / w) / eps) * viewport[1] * 0.5;
  j[3] = ((dy[1] / dy[3] - base[1] / w) / eps) * viewport[1] * 0.5;
  j[4] = ((dz[0] / dz[3] - base[0] / w) / eps) * viewport[0] * 0.5;
  j[5] = ((dz[1] / dz[3] - base[1] / w) / eps) * viewport[1] * 0.5;

  return j;
}

function projectCovariance3D(
  cov3: Float32Array,
  jacobian: Float32Array,
): [number, number, number] {
  const j00 = jacobian[0];
  const j01 = jacobian[2];
  const j10 = jacobian[1];
  const j11 = jacobian[3];

  const c00 = cov3[0];
  const c01 = cov3[1];
  const c11 = cov3[4];

  const t00 = j00 * c00 + j01 * c01;
  const t01 = j00 * c01 + j01 * c11;
  const t10 = j10 * c00 + j11 * c01;
  const t11 = j10 * c01 + j11 * c11;

  return [
    j00 * t00 + j01 * t10 + 0.3,
    j00 * t01 + j01 * t11,
    j10 * t01 + j11 * t11 + 0.3,
  ];
}

function invert2x2(
  cov: [number, number, number],
): [number, number, number] | null {
  const [a, b, c] = cov;
  const det = a * c - b * b;

  if (Math.abs(det) < 1e-8) {
    return null;
  }

  const invDet = 1 / det;
  return [c * invDet, -b * invDet, a * invDet];
}

function transformPoint(
  m: Float32Array,
  x: number,
  y: number,
  z: number,
): [number, number, number, number] {
  return [
    m[0] * x + m[4] * y + m[8] * z + m[12],
    m[1] * x + m[5] * y + m[9] * z + m[13],
    m[2] * x + m[6] * y + m[10] * z + m[14],
    m[3] * x + m[7] * y + m[11] * z + m[15],
  ];
}

function multiply4x4(a: Float32Array, b: Float32Array): Float32Array {
  const out = new Float32Array(16);

  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      out[col * 4 + row] =
        a[row] * b[col * 4] +
        a[4 + row] * b[col * 4 + 1] +
        a[8 + row] * b[col * 4 + 2] +
        a[12 + row] * b[col * 4 + 3];
    }
  }

  return out;
}

export function createOrbitCamera(
  azimuth: number,
  elevation: number,
  radius: number,
  aspect: number,
  fovY: number = Math.PI / 4,
  isOrthographic: boolean = false,
): CameraParams {
  const cosEl = Math.cos(elevation);
  const eyeX = radius * cosEl * Math.sin(azimuth);
  const eyeY = radius * Math.sin(elevation);
  const eyeZ = radius * cosEl * Math.cos(azimuth);

  const viewMatrix = lookAt(eyeX, eyeY, eyeZ, 0, 0, 0, 0, 1, 0);
  const projectionMatrix = isOrthographic
    ? orthographic(fovY, aspect, 0.1, 100, radius)
    : perspective(fovY, aspect, 0.1, 100);

  return {
    viewMatrix,
    projectionMatrix,
    viewport: [960, 540],
  };
}

function lookAt(
  ex: number,
  ey: number,
  ez: number,
  cx: number,
  cy: number,
  cz: number,
  ux: number,
  uy: number,
  uz: number,
): Float32Array {
  let zx = ex - cx;
  let zy = ey - cy;
  let zz = ez - cz;
  const zLen = Math.hypot(zx, zy, zz) || 1;
  zx /= zLen;
  zy /= zLen;
  zz /= zLen;

  let xx = uy * zz - uz * zy;
  let xy = uz * zx - ux * zz;
  let xz = ux * zy - uy * zx;
  const xLen = Math.hypot(xx, xy, xz) || 1;
  xx /= xLen;
  xy /= xLen;
  xz /= xLen;

  const yx = zy * xz - zz * xy;
  const yy = zz * xx - zx * xz;
  const yz = zx * xy - zy * xx;

  return new Float32Array([
    xx, yx, zx, 0,
    xy, yy, zy, 0,
    xz, yz, zz, 0,
    -(xx * ex + xy * ey + xz * ez),
    -(yx * ex + yy * ey + yz * ez),
    -(zx * ex + zy * ey + zz * ez),
    1,
  ]);
}

export function perspective(
  fovY: number,
  aspect: number,
  near: number,
  far: number,
): Float32Array {
  const f = 1 / Math.tan(fovY / 2);
  const nf = 1 / (near - far);

  return new Float32Array([
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (far + near) * nf, -1,
    0, 0, 2 * far * near * nf, 0,
  ]);
}

export function orthographic(
  fovY: number,
  aspect: number,
  near: number,
  far: number,
  radius: number = 4,
): Float32Array {
  const halfHeight = Math.max(0.1, radius * Math.tan(fovY / 2));
  const halfWidth = halfHeight * aspect;
  const fn = 1 / (near - far);

  return new Float32Array([
    1 / halfWidth, 0, 0, 0,
    0, 1 / halfHeight, 0, 0,
    0, 0, 2 * fn, 0,
    0, 0, (far + near) * fn, 1,
  ]);
}

