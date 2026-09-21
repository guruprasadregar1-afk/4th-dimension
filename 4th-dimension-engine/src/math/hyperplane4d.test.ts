import { describe, expect, it } from 'vitest';
import { defaultCovariance4D } from './gaussian4d';
import { rotatePrimitive4D } from './hyperplane4d';

describe('hyperplane4d', () => {
  it('preserves temporal component magnitude under zero rotation', () => {
    const primitive = {
      mean: [1, 0, 0, 2] as [number, number, number, number],
      covariance: defaultCovariance4D(),
      color: [1, 0, 0, 1] as [number, number, number, number],
      alpha: 1,
    };

    const rotated = rotatePrimitive4D(primitive, { xw: 0, yw: 0, zw: 0 });
    expect(rotated.mean[3]).toBeCloseTo(2, 5);
  });

  it('mixes spatial and temporal coordinates under x-w rotation', () => {
    const primitive = {
      mean: [1, 0, 0, 0] as [number, number, number, number],
      covariance: defaultCovariance4D(),
      color: [1, 0, 0, 1] as [number, number, number, number],
      alpha: 1,
    };

    const rotated = rotatePrimitive4D(primitive, {
      xw: Math.PI / 2,
      yw: 0,
      zw: 0,
    });

    expect(Math.abs(rotated.mean[0])).toBeLessThan(0.01);
    expect(Math.abs(rotated.mean[3])).toBeCloseTo(1, 2);
  });
});
