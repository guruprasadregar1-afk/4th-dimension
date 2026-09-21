import type { GaussianPrimitive4D } from '../types/GaussianPrimitive';
import {
  DEFAULT_HYPERPLANE,
  type HyperplaneRotation,
  rotatePrimitive4D,
} from './hyperplane4d';

export interface SliceOptions {
  hyperplaneRotation?: HyperplaneRotation;
  /** Smooth temporal weight when scrubbing (Sprint F4.2). */
  smoothTemporal?: boolean;
}

export interface Gaussian3D {
  mean: [number, number, number];
  covariance: Float32Array;
  color: [number, number, number, number];
  alpha: number;
  temporalWeight: number;
}

/** Build a 4x4 covariance matrix from diagonal variances when none is supplied. */
export function defaultCovariance4D(
  spatialVar = 0.05,
  temporalVar = 0.1,
): Float32Array {
  const m = new Float32Array(16);
  m[0] = spatialVar;
  m[5] = spatialVar;
  m[10] = spatialVar;
  m[15] = temporalVar;
  return m;
}

/**
 * Slice a 4D Gaussian at time t.
 * Uses conditional distribution: 3D spatial | temporal = t.
 */
export function slice4DAtTime(
  primitive: GaussianPrimitive4D,
  time: number,
): Gaussian3D | null {
  const [mx, my, mz, mt] = primitive.mean;
  const cov = normalizeCovariance4D(primitive.covariance);

  // Engine-time numerical safety floor: epsilon (1e-3) prevents floating-point division-by-zero or matrix inversion blowup during 4D hyperplane rotations.
  const rawSigmaT = cov[15];
  if (rawSigmaT <= 1e-8) {
    return null;
  }
  const sigmaT = Math.max(1e-3, rawSigmaT);

  const deltaT = time - mt;
  let temporalWeight = Math.exp((-0.5 * (deltaT * deltaT)) / sigmaT);

  if (temporalWeight < 1e-4) {
    return null;
  }

  const cross = [cov[3], cov[7], cov[11]];
  const invSigmaT = 1 / sigmaT;

  const mean: [number, number, number] = [
    mx + cross[0] * deltaT * invSigmaT,
    my + cross[1] * deltaT * invSigmaT,
    mz + cross[2] * deltaT * invSigmaT,
  ];

  // Enforce a minimum floor on conditional spatial variance so rotated splats never collapse to degenerate 0 or explode into needles
  const MIN_SPATIAL = 1e-4;
  const spatial = new Float32Array(9);
  spatial[0] = Math.max(MIN_SPATIAL, cov[0] - cross[0] * cross[0] * invSigmaT);
  spatial[4] = Math.max(MIN_SPATIAL, cov[5] - cross[1] * cross[1] * invSigmaT);
  spatial[8] = Math.max(MIN_SPATIAL, cov[10] - cross[2] * cross[2] * invSigmaT);
  spatial[1] = spatial[3] = cov[1] - cross[0] * cross[1] * invSigmaT;
  spatial[2] = spatial[6] = cov[2] - cross[0] * cross[2] * invSigmaT;
  spatial[5] = spatial[7] = cov[6] - cross[1] * cross[2] * invSigmaT;

  return {
    mean,
    covariance: spatial,
    color: primitive.color,
    alpha: primitive.alpha * temporalWeight,
    temporalWeight,
  };
}

export function sliceSceneAtTime(
  primitives: GaussianPrimitive4D[],
  time: number,
  options: SliceOptions = {},
): Gaussian3D[] {
  const rotation = options.hyperplaneRotation ?? DEFAULT_HYPERPLANE;
  const result: Gaussian3D[] = [];

  for (const primitive of primitives) {
    const rotated = rotatePrimitive4D(primitive, rotation);
    const sliced = slice4DAtTime(rotated, time);
    if (sliced) {
      if (options.smoothTemporal) {
        sliced.alpha *= smoothstep(temporalWeightToNormalized(sliced.temporalWeight));
      }
      result.push(sliced);
    }
  }

  return result;
}

function temporalWeightToNormalized(weight: number): number {
  return Math.min(1, Math.max(0, weight));
}

function smoothstep(x: number): number {
  return x * x * (3 - 2 * x);
}

function normalizeCovariance4D(input: Float32Array | number[]): Float32Array {
  if (input instanceof Float32Array && input.length === 16) {
    return input;
  }

  if (Array.isArray(input) && input.length === 16) {
    return new Float32Array(input);
  }

  return defaultCovariance4D();
}
