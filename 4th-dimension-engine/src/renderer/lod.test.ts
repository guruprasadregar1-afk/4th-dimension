import { describe, expect, it } from 'vitest';
import type { Splat2D } from '../math/projection';
import {
  applyRenderBudget,
  QUALITY_MAX_SPLATS,
  splatImportance,
} from './lod';

function makeSplat(
  depth: number,
  alpha: number,
  conicScale = 1,
): Splat2D {
  return {
    center: [0, 0],
    conic: [conicScale, 0, conicScale],
    color: [1, 1, 1, 1],
    alpha,
    depth,
    radius: 10,
  };
}

describe('splatImportance', () => {
  it('ranks near opaque splats above far faint ones', () => {
    const near = makeSplat(0.1, 0.9, 2);
    const far = makeSplat(8, 0.1, 0.5);
    expect(splatImportance(near)).toBeGreaterThan(splatImportance(far));
  });
});

describe('applyRenderBudget', () => {
  it('keeps all splats when under budget', () => {
    const splats = [makeSplat(1, 0.8), makeSplat(2, 0.6)];
    applyRenderBudget(splats, QUALITY_MAX_SPLATS.high);
    expect(splats).toHaveLength(2);
    expect(splats[0].depth).toBeGreaterThanOrEqual(splats[1].depth);
  });

  it('trims to budget by importance then depth-sorts', () => {
    const splats = [
      makeSplat(5, 0.05, 0.2),
      makeSplat(0.5, 0.95, 3),
      makeSplat(2, 0.4, 1),
      makeSplat(0.2, 0.9, 2),
    ];

    applyRenderBudget(splats, 2);

    expect(splats).toHaveLength(2);
    expect(splats[0].depth).toBeGreaterThanOrEqual(splats[1].depth);
    expect(splats.some((s) => s.alpha >= 0.9)).toBe(true);
  });
});
