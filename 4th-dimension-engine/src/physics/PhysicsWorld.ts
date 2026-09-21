import type { GaussianPrimitive4D } from '../types/GaussianPrimitive';
import {
  buildProximityConstraints,
  XpbdSolver,
} from './xpbd';
import type {
  DistanceConstraint,
  Particle,
  PhysicsConfig,
  PhysicsStats,
} from './types';
import { DEFAULT_PHYSICS_CONFIG } from './types';

/**
 * Maps Gaussian primitives to XPBD particles (spatial xyz only).
 * Rebuilds constraints from rest positions when initialized.
 */
export class PhysicsWorld {
  private readonly solver = new XpbdSolver();
  private config: PhysicsConfig = { ...DEFAULT_PHYSICS_CONFIG };
  private particles: Particle[] = [];
  private constraints: DistanceConstraint[] = [];
  private primitiveIndices: number[] = [];
  private restPositions: [number, number, number][] = [];
  private lastStepMs = 0;

  configure(partial: Partial<PhysicsConfig>): void {
    this.config = {
      ...this.config,
      ...partial,
      groundPlane: {
        ...this.config.groundPlane,
        ...partial.groundPlane,
      },
    };
    if (partial.compliance !== undefined) {
      for (const constraint of this.constraints) {
        constraint.compliance = partial.compliance;
      }
    }
    this.updatePinStates();
  }

  getConfig(): PhysicsConfig {
    return { ...this.config };
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }

  setPinTopParticles(enabled: boolean): void {
    this.config.pinTopParticles = enabled;
    this.updatePinStates();
  }

  getStats(): PhysicsStats {
    const pinnedCount = this.particles.filter((p) => p.isPinned || p.invMass <= 0).length;
    return {
      enabled: this.config.enabled,
      particleCount: this.particles.length,
      pinnedCount,
      constraintCount: this.constraints.length,
      lastStepMs: this.lastStepMs,
    };
  }

  /** Snapshot rest layout and build constraint graph from spatial proximity. */
  initialize(primitives: GaussianPrimitive4D[]): void {
    this.particles = [];
    this.constraints = [];
    this.primitiveIndices = [];
    this.restPositions = [];

    const candidates: {
      primitiveIndex: number;
      position: [number, number, number];
    }[] = [];

    for (let i = 0; i < primitives.length; i += 1) {
      const [x, y, z] = primitives[i].mean;
      candidates.push({ primitiveIndex: i, position: [x, y, z] });
    }

    candidates.sort((a, b) => {
      const distA = a.position[0] ** 2 + a.position[1] ** 2 + a.position[2] ** 2;
      const distB = b.position[0] ** 2 + b.position[1] ** 2 + b.position[2] ** 2;
      return distA - distB;
    });

    const limit = Math.min(candidates.length, this.config.maxParticles);
    const selected = candidates.slice(0, limit);

    for (const entry of selected) {
      const [x, y, z] = entry.position;
      this.primitiveIndices.push(entry.primitiveIndex);
      this.restPositions.push([x, y, z]);
      this.particles.push({
        x,
        y,
        z,
        px: x,
        py: y,
        pz: z,
        invMass: 1,
        isPinned: false,
      });
    }

    this.updatePinStates();

    this.constraints = buildProximityConstraints(
      this.restPositions,
      this.config.linkRadius,
    );
  }

  private updatePinStates(): void {
    if (this.particles.length === 0) return;

    if (this.config.pinTopParticles) {
      // Find top Y particles threshold
      const sortedY = [...this.particles].sort((a, b) => b.y - a.y);
      const topCutoffCount = Math.max(1, Math.ceil(sortedY.length * this.config.pinTopThreshold));
      const minYThreshold = sortedY[topCutoffCount - 1].y;

      for (const particle of this.particles) {
        if (particle.y >= minYThreshold) {
          particle.invMass = 0;
          particle.isPinned = true;
        } else {
          particle.invMass = 1;
          particle.isPinned = false;
        }
      }
    } else {
      for (const particle of this.particles) {
        particle.invMass = 1;
        particle.isPinned = false;
      }
    }
  }

  reset(): void {
    for (let i = 0; i < this.particles.length; i += 1) {
      const [x, y, z] = this.restPositions[i];
      const particle = this.particles[i];
      particle.x = x;
      particle.y = y;
      particle.z = z;
      particle.px = x;
      particle.py = y;
      particle.pz = z;
    }
    this.updatePinStates();
  }

  /** Export current simulated particle state snapshot. */
  getSnapshot(time = 0, hyperplaneAngles?: Record<string, number>) {
    return {
      time,
      hyperplaneAngles: hyperplaneAngles || {},
      physicsState: {
        config: this.config,
        particles: this.particles.map((p, idx) => ({
          primitiveIndex: this.primitiveIndices[idx],
          x: p.x,
          y: p.y,
          z: p.z,
          px: p.px,
          py: p.py,
          pz: p.pz,
          invMass: p.invMass,
          isPinned: p.isPinned || false,
        })),
      },
    };
  }

  /** Restore simulated particle state from snapshot payload. */
  loadSnapshot(snapshot: any): void {
    if (!snapshot || !snapshot.physicsState || !snapshot.physicsState.particles) {
      return;
    }

    const savedParticles = snapshot.physicsState.particles as any[];
    for (let i = 0; i < this.particles.length && i < savedParticles.length; i += 1) {
      const sp = savedParticles[i];
      const particle = this.particles[i];
      particle.x = sp.x;
      particle.y = sp.y;
      particle.z = sp.z;
      particle.px = sp.px;
      particle.py = sp.py;
      particle.pz = sp.pz;
      particle.invMass = sp.invMass;
      particle.isPinned = sp.isPinned;
    }
  }

  /** Advance simulation and write spatial means back into primitives. */
  step(dt: number, primitives: GaussianPrimitive4D[]): void {
    if (!this.config.enabled || this.particles.length === 0 || dt <= 0) {
      return;
    }

    const start = performance.now();

    this.solver.step(
      this.particles,
      this.constraints,
      dt,
      this.config.substeps,
      this.config.constraintIterations,
      this.config.gravity,
      this.config.groundPlane,
    );

    for (let i = 0; i < this.particles.length; i += 1) {
      const particle = this.particles[i];
      const primitiveIndex = this.primitiveIndices[i];
      primitives[primitiveIndex].mean[0] = particle.x;
      primitives[primitiveIndex].mean[1] = particle.y;
      primitives[primitiveIndex].mean[2] = particle.z;
    }

    this.lastStepMs = performance.now() - start;
  }
}
