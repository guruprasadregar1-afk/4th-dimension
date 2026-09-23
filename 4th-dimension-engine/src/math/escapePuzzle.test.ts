import { describe, expect, it } from 'vitest';
import {
  compute4DEscapePoint,
  constrain2DDot,
  constrain3DBall,
  project4DPuzzlePoint,
} from './escapePuzzle';

describe('Impossible Escape Puzzle Math & Constraints', () => {
  it('Level 1: constrain2DDot prevents dot from moving outside 2D square bounds', () => {
    const attemptedEscapeRight = constrain2DDot({ x: 150, y: 0 }, 70);
    expect(attemptedEscapeRight.x).toBe(70);
    expect(attemptedEscapeRight.y).toBe(0);

    const attemptedEscapeCorner = constrain2DDot({ x: -200, y: 300 }, 70);
    expect(attemptedEscapeCorner.x).toBe(-70);
    expect(attemptedEscapeCorner.y).toBe(70);
  });

  it('Level 2: constrain3DBall prevents ball from moving outside 3D box bounds', () => {
    const attemptedEscape = constrain3DBall({ x: 2.0, y: -5.0, z: 0.1 }, 0.75);
    expect(attemptedEscape.x).toBe(0.75);
    expect(attemptedEscape.y).toBe(-0.75);
    expect(attemptedEscape.z).toBe(0.1);
  });

  it('Level 2: compute4DEscapePoint uses genuine 4D w-displacement during escape transition', () => {
    const startPoint = compute4DEscapePoint(0.0);
    expect(startPoint).toEqual([0, 0, 0, 0]);

    // Mid-escape (t=0.5): ball is translated in 4D space with w > 0
    const midPoint = compute4DEscapePoint(0.5);
    expect(midPoint[3]).toBeGreaterThan(0); // w coordinate is genuinely non-zero!
    expect(midPoint[0]).toBeGreaterThan(0); // X coordinate moved outside box in 4D space

    // End-escape (t=1.0): ball rests at valid 3D position outside box with w=0
    const endPoint = compute4DEscapePoint(1.0);
    expect(endPoint[3]).toBe(0); // Returned back to 3D space (w=0)
    expect(endPoint[0]).toBeCloseTo(2.0, 5); // Successfully outside box
  });

  it('project4DPuzzlePoint correctly projects 4D coordinates to screen space', () => {
    const in3D = project4DPuzzlePoint([0, 0, 0, 0], 0, 0, 480, 320);
    expect(in3D.screenX).toBeCloseTo(240, 1);
    expect(in3D.screenY).toBeCloseTo(160, 1);
    expect(in3D.alpha).toBe(1.0);

    const in4D = project4DPuzzlePoint([0, 0, 0, 2.0], 0, 0, 480, 320);
    expect(in4D.wScale).toBeGreaterThan(1.0);
    expect(in4D.alpha).toBeLessThan(1.0);
  });
});
