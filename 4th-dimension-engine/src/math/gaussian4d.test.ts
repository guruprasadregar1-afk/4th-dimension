import { describe, expect, it } from 'vitest';
import {
  defaultCovariance4D,
  slice4DAtTime,
  sliceSceneAtTime,
} from './gaussian4d';
import type { GaussianPrimitive4D } from '../types/GaussianPrimitive';

function makePrimitive(
  mean: [number, number, number, number],
  temporalVar = 0.15,
): GaussianPrimitive4D {
  return {
    mean,
    covariance: defaultCovariance4D(0.04, temporalVar),
    color: [1, 0, 0, 1],
    alpha: 0.9,
  };
}

describe('gaussian4d', () => {
  it('slices a 4D Gaussian at matching time', () => {
    const primitive = makePrimitive([0, 0, 0, 2.0]);
    const result = slice4DAtTime(primitive, 2.0);

    expect(result).not.toBeNull();
    expect(result!.mean[0]).toBeCloseTo(0, 1);
    expect(result!.temporalWeight).toBeCloseTo(1, 1);
  });

  it('returns null when temporal weight is negligible', () => {
    const primitive = makePrimitive([0, 0, 0, 0], 0.01);
    const result = slice4DAtTime(primitive, 10);

    expect(result).toBeNull();
  });

  it('sliceSceneAtTime filters invisible primitives', () => {
    const primitives = [
      makePrimitive([0, 0, 0, 0]),
      makePrimitive([1, 0, 0, 5], 0.01),
    ];

    const atZero = sliceSceneAtTime(primitives, 0);
    expect(atZero.length).toBe(1);
    expect(atZero[0].mean[0]).toBeCloseTo(0, 1);
  });

  it('shifts spatial mean based on time offset', () => {
    const cov = defaultCovariance4D(0.04, 0.15);
    cov[3] = 0.02;

    const primitive: GaussianPrimitive4D = {
      mean: [0, 0, 0, 0],
      covariance: cov,
      color: [1, 1, 1, 1],
      alpha: 1,
    };

    const result = slice4DAtTime(primitive, 1.0);
    expect(result).not.toBeNull();
    expect(result!.mean[0]).not.toBeCloseTo(0, 1);
  });

  it('prevents degenerate spatial covariance explosion when rotated through 4D hyperplanes with zero/near-zero temporal variance', () => {
    // Construct primitive with tiny temporal variance (1e-6) and non-zero spatial variance
    const cov = new Float32Array(16);
    cov[0] = 0.04; // xx
    cov[5] = 0.04; // yy
    cov[10] = 0.04; // zz
    cov[15] = 1e-6; // tiny tt variance

    const primitive: GaussianPrimitive4D = {
      mean: [0, 0, 0, 0],
      covariance: cov,
      color: [1, 1, 1, 1],
      alpha: 1,
    };

    // Rotate 4D primitive by 45 deg through xw hyperplane
    const sliced = sliceSceneAtTime([primitive], 0, {
      hyperplaneRotation: { xw: Math.PI / 4, yw: 0, zw: 0 },
    });

    expect(sliced.length).toBe(1);
    const spatialCov = sliced[0].covariance;

    // Verify spatial covariance terms are non-NaN, non-infinite, and bounded above zero
    expect(Number.isNaN(spatialCov[0])).toBe(false);
    expect(Number.isFinite(spatialCov[0])).toBe(true);
    expect(spatialCov[0]).toBeGreaterThan(0);
    expect(spatialCov[4]).toBeGreaterThan(0);
    expect(spatialCov[8]).toBeGreaterThan(0);
  });
});
