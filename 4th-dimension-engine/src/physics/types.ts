/** A simulated particle (3D spatial — temporal mean[3] is unchanged). */
export interface Particle {
  x: number;
  y: number;
  z: number;
  px: number;
  py: number;
  pz: number;
  invMass: number;
  isPinned?: boolean;
}

/** XPBD distance constraint between two particles. */
export interface DistanceConstraint {
  i: number;
  j: number;
  restLength: number;
  compliance: number;
}

export interface GroundPlaneConfig {
  enabled: boolean;
  yFloor: number;
  restitution: number; // 0 (inelastic) to 1 (elastic bounce)
  friction: number; // 0 to 1
}

export interface PhysicsConfig {
  enabled: boolean;
  gravity: [number, number, number];
  compliance?: number;
  substeps: number;
  constraintIterations: number;
  linkRadius: number;
  maxParticles: number;
  groundPlane: GroundPlaneConfig;
  pinTopParticles: boolean;
  pinTopThreshold: number; // Percentage threshold of highest particles to pin (e.g., 0.1 for top 10%)
}

export interface PhysicsStats {
  enabled: boolean;
  particleCount: number;
  pinnedCount: number;
  constraintCount: number;
  lastStepMs: number;
}

export const DEFAULT_PHYSICS_CONFIG: PhysicsConfig = {
  enabled: false,
  gravity: [0, -2, 0],
  compliance: 1e-6,
  substeps: 4,
  constraintIterations: 6,
  linkRadius: 1.5,
  maxParticles: 512,
  groundPlane: {
    enabled: true,
    yFloor: -2.0,
    restitution: 0.3,
    friction: 0.8,
  },
  pinTopParticles: false,
  pinTopThreshold: 0.1,
};
