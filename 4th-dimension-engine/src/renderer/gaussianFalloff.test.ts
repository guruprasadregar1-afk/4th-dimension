import { describe, expect, it } from 'vitest';
import { createOrbitCamera, projectSplats } from '../math/projection';
import type { Gaussian3D } from '../math/gaussian4d';

/**
 * Calculates fragment Gaussian falloff opacity given 2D conic matrix and pixel offset.
 * Matches splat.frag.glsl shader logic: alpha = baseAlpha * exp(-0.5 * (c_xx * dx^2 + c_yy * dy^2 + 2 * c_xy * dx * dy))
 */
export function computeShaderGaussianAlpha(
  baseAlpha: number,
  conic: [number, number, number],
  offsetPixels: [number, number],
): number {
  const [cxx, cxy, cyy] = conic;
  const [dx, dy] = offsetPixels;
  const power = -0.5 * (cxx * dx * dx + cyy * dy * dy + 2.0 * cxy * dx * dy);

  if (power > 0.0) return 0.0;
  const alpha = Math.min(0.99, baseAlpha * Math.exp(power));
  return alpha < 0.004 ? 0.0 : alpha;
}

describe('Gaussian Splat Falloff Regression Test (FIX 1 + FIX 2 + FIX 5)', () => {
  it('asserts opacity falls off smoothly from center to edge in pixel space', () => {
    // 3D Gaussian at center of scene
    const splat: Gaussian3D = {
      mean: [0, 0, 0],
      covariance: new Float32Array([
        0.04, 0, 0,
        0, 0.04, 0,
        0, 0, 0.04,
      ]),
      color: [0.2, 0.6, 0.9, 1.0],
      alpha: 0.9,
      temporalWeight: 1,
    };

    const camera = createOrbitCamera(0, 0, 4, 1);
    camera.viewport = [800, 600];

    const projected = projectSplats([splat], camera);
    expect(projected.length).toBe(1);

    const { conic, alpha: baseAlpha, radius } = projected[0];
    expect(radius).toBeGreaterThan(5); // Dynamic pixel radius computed

    // Center offset (0, 0)
    const centerAlpha = computeShaderGaussianAlpha(baseAlpha, conic, [0, 0]);
    // Halfway to edge (radius / 2)
    const midAlpha = computeShaderGaussianAlpha(baseAlpha, conic, [radius * 0.5, 0]);
    // Quad edge offset (radius, 0)
    const edgeAlpha = computeShaderGaussianAlpha(baseAlpha, conic, [radius, 0]);

    // Center should have full base opacity (~0.9)
    expect(centerAlpha).toBeCloseTo(0.9, 1);

    // Mid-offset must have noticeably lower opacity than center
    expect(midAlpha).toBeLessThan(centerAlpha * 0.7);

    // Edge-offset opacity must fall off to near zero (<= 0.05)
    expect(edgeAlpha).toBeLessThan(0.05);

    // Verify falloff order: center > mid > edge
    expect(centerAlpha).toBeGreaterThan(midAlpha);
    expect(midAlpha).toBeGreaterThan(edgeAlpha);
  });

  it('verifies dynamic quad radius scales with distance and covariance', () => {
    const smallCovariance: Gaussian3D = {
      mean: [0, 0, 0],
      covariance: new Float32Array([0.01, 0, 0, 0, 0.01, 0, 0, 0, 0.01]),
      color: [1, 0, 0, 1],
      alpha: 1,
      temporalWeight: 1,
    };

    const largeCovariance: Gaussian3D = {
      mean: [0, 0, 0],
      covariance: new Float32Array([0.16, 0, 0, 0, 0.16, 0, 0, 0, 0.16]),
      color: [1, 0, 0, 1],
      alpha: 1,
      temporalWeight: 1,
    };

    const camera = createOrbitCamera(0, 0, 4, 1);
    camera.viewport = [800, 600];

    const [projSmall] = projectSplats([smallCovariance], camera);
    const [projLarge] = projectSplats([largeCovariance], camera);

    // Larger 3D covariance must yield a strictly larger pixel radius quad extent
    expect(projLarge.radius).toBeGreaterThan(projSmall.radius * 1.5);
  });
});
