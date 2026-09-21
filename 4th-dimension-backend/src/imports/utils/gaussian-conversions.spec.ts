import {
  buildCovariance3D,
  convert3dgsTo4dPrimitive,
  normalizePrimitiveCoordinates,
  shDcToRgb,
  sigmoid,
} from './gaussian-conversions';

describe('gaussian-conversions', () => {
  it('converts SH DC to RGB in [0,1]', () => {
    const rgb = shDcToRgb(0, 0, 0);
    expect(rgb[0]).toBeCloseTo(0.5, 2);
    expect(rgb[1]).toBeCloseTo(0.5, 2);
    expect(rgb[2]).toBeCloseTo(0.5, 2);
  });

  it('applies sigmoid to opacity logit', () => {
    expect(sigmoid(0)).toBeCloseTo(0.5, 5);
    expect(sigmoid(10)).toBeGreaterThan(0.99);
  });

  it('builds positive semi-definite 3D covariance from identity rotation', () => {
    const cov = buildCovariance3D([1, 0, 0, 0], [1, 2, 3]);
    expect(cov[0]).toBeCloseTo(1, 5);
    expect(cov[4]).toBeCloseTo(4, 5);
    expect(cov[8]).toBeCloseTo(9, 5);
  });

  it('converts 3DGS gaussian to 4D primitive', () => {
    const primitive = convert3dgsTo4dPrimitive({
      x: 1,
      y: 2,
      z: 3,
      opacity: 0,
      scale0: 0,
      scale1: 0,
      scale2: 0,
      rot0: 1,
      rot1: 0,
      rot2: 0,
      rot3: 0,
      fDc0: 0,
      fDc1: 0,
      fDc2: 0,
      time: 1.5,
    });

    expect(primitive.mean).toEqual([1, 2, 3, 1.5]);
    expect(primitive.covariance).toHaveLength(16);
    expect(primitive.covariance[15]).toBeGreaterThan(0);
    expect(primitive.alpha).toBeCloseTo(0.5, 5);
  });

  it('normalizes uncentered, large-scale point clouds to centroid origin with max radius <= 3.0', () => {
    const primitives = [
      { mean: [50, -30, 30, 0], covariance: [], color: [1, 1, 1, 1], alpha: 1 },
      { mean: [350, -30, 30, 0], covariance: [], color: [1, 1, 1, 1], alpha: 1 },
      { mean: [200, 170, 30, 0], covariance: [], color: [1, 1, 1, 1], alpha: 1 },
    ];

    normalizePrimitiveCoordinates(primitives, 3.0);

    // Centroid of [50, -30, 30], [350, -30, 30], [200, 170, 30] is [200, 36.667, 30]
    // After normalization, average mean[0,1,2] should be ~0
    const avgX = (primitives[0].mean[0] + primitives[1].mean[0] + primitives[2].mean[0]) / 3;
    const avgY = (primitives[0].mean[1] + primitives[1].mean[1] + primitives[2].mean[1]) / 3;
    const avgZ = (primitives[0].mean[2] + primitives[1].mean[2] + primitives[2].mean[2]) / 3;

    expect(avgX).toBeCloseTo(0, 5);
    expect(avgY).toBeCloseTo(0, 5);
    expect(avgZ).toBeCloseTo(0, 5);

    // Max distance from centroid should be <= 3.0
    for (const p of primitives) {
      const dist = Math.hypot(p.mean[0], p.mean[1], p.mean[2]);
      expect(dist).toBeLessThanOrEqual(3.0001);
    }
  });
});

