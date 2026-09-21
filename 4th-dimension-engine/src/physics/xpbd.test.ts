import { describe, expect, it } from 'vitest';
import { buildProximityConstraints, XpbdSolver } from './xpbd';
import type { Particle } from './types';

describe('buildProximityConstraints', () => {
  it('links particles within radius', () => {
    const positions: [number, number, number][] = [
      [0, 0, 0],
      [1, 0, 0],
      [5, 0, 0],
    ];

    const constraints = buildProximityConstraints(positions, 1.5);
    expect(constraints).toHaveLength(1);
    expect(constraints[0].restLength).toBeCloseTo(1);
  });
});

describe('XpbdSolver', () => {
  it('pulls stretched distance constraint toward rest length', () => {
    const particles: Particle[] = [
      { x: 0, y: 0, z: 0, px: 0, py: 0, pz: 0, invMass: 1 },
      { x: 2, y: 0, z: 0, px: 2, py: 0, pz: 0, invMass: 1 },
    ];

    const solver = new XpbdSolver();
    const constraints = [{ i: 0, j: 1, restLength: 1, compliance: 0 }];

    for (let step = 0; step < 20; step += 1) {
      solver.step(particles, constraints, 1 / 60, 4, 8, [0, 0, 0]);
    }

    const dist = Math.hypot(
      particles[1].x - particles[0].x,
      particles[1].y - particles[0].y,
      particles[1].z - particles[0].z,
    );

    expect(dist).toBeCloseTo(1, 1);
  });

  it('applies gravity to free particles', () => {
    const particles: Particle[] = [
      { x: 0, y: 1, z: 0, px: 0, py: 1, pz: 0, invMass: 1 },
    ];

    const solver = new XpbdSolver();
    solver.step(particles, [], 1 / 30, 2, 1, [0, -10, 0]);

    expect(particles[0].y).toBeLessThan(1);
  });

  it('keeps pinned particles stationary', () => {
    const particles: Particle[] = [
      { x: 0, y: 5, z: 0, px: 0, py: 5, pz: 0, invMass: 0, isPinned: true },
    ];

    const solver = new XpbdSolver();
    solver.step(particles, [], 1 / 30, 2, 1, [0, -10, 0]);

    expect(particles[0].y).toBe(5);
  });

  it('stops particles at ground plane', () => {
    const particles: Particle[] = [
      { x: 0, y: -1.9, z: 0, px: 0, py: -1.9, pz: 0, invMass: 1 },
    ];

    const solver = new XpbdSolver();
    solver.step(
      particles,
      [],
      1 / 30,
      2,
      1,
      [0, -10, 0],
      { enabled: true, yFloor: -2.0, restitution: 0.2, friction: 0.5 },
    );

    expect(particles[0].y).toBeGreaterThanOrEqual(-2.0);
  });
});
