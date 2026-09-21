import { describe, expect, it } from 'vitest';
import { normalizeScenePayload } from './sceneApi';

describe('normalizeScenePayload', () => {
  it('converts covariance arrays to Float32Array', () => {
    const payload = normalizeScenePayload({
      id: 'abc',
      title: 'Test',
      duration: 5,
      primitives: [
        {
          mean: [0, 0, 0, 0],
          covariance: Array(16).fill(0.04),
          color: [1, 0, 0, 1],
          alpha: 0.9,
        },
      ],
    });

    expect(payload.primitives[0].covariance).toBeInstanceOf(Float32Array);
    expect(payload.duration).toBe(5);
  });

  it('preserves Float32Array covariance unchanged', () => {
    const cov = new Float32Array(16);
    const payload = normalizeScenePayload({
      id: 'abc',
      title: 'Test',
      duration: 3,
      primitives: [
        {
          mean: [1, 2, 3, 4],
          covariance: cov,
          color: [1, 1, 1, 1],
          alpha: 1,
        },
      ],
    });

    expect(payload.primitives[0].covariance).toBe(cov);
  });
});
