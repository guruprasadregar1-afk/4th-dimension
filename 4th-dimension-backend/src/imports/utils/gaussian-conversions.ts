import { GaussianPrimitive } from '../../scenes/schemas/gaussian-primitive.schema';

const SH_C0 = 0.28209479177387814;

export function sigmoid(value: number): number {
  return 1 / (1 + Math.exp(-value));
}

export function shDcToRgb(fDc0: number, fDc1: number, fDc2: number): number[] {
  const r = Math.min(1, Math.max(0, SH_C0 * fDc0 + 0.5));
  const g = Math.min(1, Math.max(0, SH_C0 * fDc1 + 0.5));
  const b = Math.min(1, Math.max(0, SH_C0 * fDc2 + 0.5));
  return [r, g, b, 1];
}

export function normalizeQuaternion(
  rot0: number,
  rot1: number,
  rot2: number,
  rot3: number,
): [number, number, number, number] {
  const length = Math.hypot(rot0, rot1, rot2, rot3) || 1;
  return [rot0 / length, rot1 / length, rot2 / length, rot3 / length];
}

/** Build a 3x3 covariance (row-major flat 9) from quaternion rotation and linear scales. */
export function buildCovariance3D(
  rot: [number, number, number, number],
  scales: [number, number, number],
): number[] {
  const [w, x, y, z] = rot;
  const r00 = 1 - 2 * (y * y + z * z);
  const r01 = 2 * (x * y - w * z);
  const r02 = 2 * (x * z + w * y);
  const r10 = 2 * (x * y + w * z);
  const r11 = 1 - 2 * (x * x + z * z);
  const r12 = 2 * (y * z - w * x);
  const r20 = 2 * (x * z - w * y);
  const r21 = 2 * (y * z + w * x);
  const r22 = 1 - 2 * (x * x + y * y);

  const s0 = scales[0] * scales[0];
  const s1 = scales[1] * scales[1];
  const s2 = scales[2] * scales[2];

  const m00 = r00 * s0;
  const m01 = r01 * s1;
  const m02 = r02 * s2;
  const m10 = r10 * s0;
  const m11 = r11 * s1;
  const m12 = r12 * s2;
  const m20 = r20 * s0;
  const m21 = r21 * s1;
  const m22 = r22 * s2;

  return [
    m00 * r00 + m01 * r01 + m02 * r02,
    m00 * r10 + m01 * r11 + m02 * r12,
    m00 * r20 + m01 * r21 + m02 * r22,
    m10 * r00 + m11 * r01 + m12 * r02,
    m10 * r10 + m11 * r11 + m12 * r12,
    m10 * r20 + m11 * r21 + m12 * r22,
    m20 * r00 + m21 * r01 + m22 * r02,
    m20 * r10 + m21 * r11 + m22 * r12,
    m20 * r20 + m21 * r21 + m22 * r22,
  ];
}

export function embedCovariance4D(
  cov3: number[],
  temporalVar = 0.1,
): number[] {
  // Import-time physical default: ensures static 3D imports have a reasonable physical temporal extent (sigma_t^2 >= 0.05) when embedded into 4D space.
  const safeTemporalVar = Math.max(0.05, temporalVar);
  return [
    cov3[0],
    cov3[1],
    cov3[2],
    0,
    cov3[3],
    cov3[4],
    cov3[5],
    0,
    cov3[6],
    cov3[7],
    cov3[8],
    0,
    0,
    0,
    0,
    safeTemporalVar,
  ];
}

export interface ThreeDgsGaussian {
  x: number;
  y: number;
  z: number;
  opacity: number;
  scale0: number;
  scale1: number;
  scale2: number;
  rot0: number;
  rot1: number;
  rot2: number;
  rot3: number;
  fDc0: number;
  fDc1: number;
  fDc2: number;
  time?: number;
}

export function convert3dgsTo4dPrimitive(
  gaussian: ThreeDgsGaussian,
  defaultTemporalVar = 0.1,
): GaussianPrimitive {
  const rot = normalizeQuaternion(
    gaussian.rot0,
    gaussian.rot1,
    gaussian.rot2,
    gaussian.rot3,
  );
  const scales: [number, number, number] = [
    Math.exp(gaussian.scale0),
    Math.exp(gaussian.scale1),
    Math.exp(gaussian.scale2),
  ];
  const cov3 = buildCovariance3D(rot, scales);
  const color = shDcToRgb(gaussian.fDc0, gaussian.fDc1, gaussian.fDc2);

  return {
    mean: [gaussian.x, gaussian.y, gaussian.z, gaussian.time ?? 0],
    covariance: embedCovariance4D(cov3, defaultTemporalVar),
    color,
    alpha: sigmoid(gaussian.opacity),
  };
}

export function splatU8ToQuaternion(
  q0: number,
  q1: number,
  q2: number,
  q3: number,
): [number, number, number, number] {
  return normalizeQuaternion(
    (q0 - 128) / 128,
    (q1 - 128) / 128,
    (q2 - 128) / 128,
    (q3 - 128) / 128,
  );
}

export function normalizePrimitiveCoordinates(
  primitives: GaussianPrimitive[],
  targetRadius = 3.0,
): GaussianPrimitive[] {
  if (primitives.length === 0) return primitives;

  let sumX = 0;
  let sumY = 0;
  let sumZ = 0;
  for (const pt of primitives) {
    sumX += pt.mean[0];
    sumY += pt.mean[1];
    sumZ += pt.mean[2];
  }
  const cx = sumX / primitives.length;
  const cy = sumY / primitives.length;
  const cz = sumZ / primitives.length;

  let maxDist = 0;
  for (const pt of primitives) {
    const dist = Math.hypot(pt.mean[0] - cx, pt.mean[1] - cy, pt.mean[2] - cz);
    maxDist = Math.max(maxDist, dist);
  }

  const scaleFactor = maxDist > 0 ? targetRadius / maxDist : 1.0;

  for (const pt of primitives) {
    pt.mean[0] = (pt.mean[0] - cx) * scaleFactor;
    pt.mean[1] = (pt.mean[1] - cy) * scaleFactor;
    pt.mean[2] = (pt.mean[2] - cz) * scaleFactor;
  }

  return primitives;
}

