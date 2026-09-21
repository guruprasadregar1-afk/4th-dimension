import type { DistanceConstraint, GroundPlaneConfig, Particle } from './types';

/**
 * Extended Position Based Dynamics solver (distance constraints & collision support).
 * @see https://matthias-research.github.io/pages/publications/PBDtutorial.pdf
 */
export class XpbdSolver {
  step(
    particles: Particle[],
    constraints: DistanceConstraint[],
    dt: number,
    substeps: number,
    iterations: number,
    gravity: [number, number, number],
    groundPlane?: GroundPlaneConfig,
  ): void {
    if (particles.length === 0 || dt <= 0) {
      return;
    }

    const h = dt / Math.max(substeps, 1);

    for (let sub = 0; sub < substeps; sub += 1) {
      for (const particle of particles) {
        if (particle.invMass <= 0 || particle.isPinned) {
          // Pinned particles do not move under forces
          particle.px = particle.x;
          particle.py = particle.y;
          particle.pz = particle.z;
          continue;
        }

        const vx = particle.x - particle.px;
        const vy = particle.y - particle.py;
        const vz = particle.z - particle.pz;

        particle.px = particle.x;
        particle.py = particle.y;
        particle.pz = particle.z;

        particle.x += vx + gravity[0] * h * h;
        particle.y += vy + gravity[1] * h * h;
        particle.z += vz + gravity[2] * h * h;
      }

      for (let iter = 0; iter < iterations; iter += 1) {
        for (const constraint of constraints) {
          solveDistanceConstraint(particles, constraint, h);
        }

        // Apply ground plane collisions after distance constraints
        if (groundPlane?.enabled) {
          solveGroundPlaneCollision(particles, groundPlane);
        }
      }
    }
  }
}

function solveGroundPlaneCollision(
  particles: Particle[],
  groundPlane: GroundPlaneConfig,
): void {
  const { yFloor, restitution, friction } = groundPlane;

  for (const particle of particles) {
    if (particle.invMass <= 0 || particle.isPinned) {
      continue;
    }

    if (particle.y < yFloor) {
      // Push particle back above floor
      particle.y = yFloor;

      // Calculate velocity before collision
      const vy = particle.y - particle.py;
      const vx = particle.x - particle.px;
      const vz = particle.z - particle.pz;

      // Apply bounce / restitution on vertical velocity
      if (vy < 0) {
        particle.py = particle.y + vy * restitution;
      }

      // Apply friction damping on horizontal velocity
      const frictionFactor = 1 - Math.min(Math.max(friction, 0), 1);
      particle.px = particle.x - vx * frictionFactor;
      particle.pz = particle.z - vz * frictionFactor;
    }
  }
}

function solveDistanceConstraint(
  particles: Particle[],
  constraint: DistanceConstraint,
  dt: number,
): void {
  const a = particles[constraint.i];
  const b = particles[constraint.j];

  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dz = b.z - a.z;
  const dist = Math.hypot(dx, dy, dz);

  if (dist < 1e-8) {
    return;
  }

  const wA = a.invMass;
  const wB = b.invMass;
  const wSum = wA + wB;

  if (wSum <= 0) {
    return;
  }

  const nx = dx / dist;
  const ny = dy / dist;
  const nz = dz / dist;
  const C = dist - constraint.restLength;
  const alpha = constraint.compliance / (dt * dt);
  const lambda = -C / (wSum + alpha);

  const cx = lambda * nx;
  const cy = lambda * ny;
  const cz = lambda * nz;

  if (wA > 0) {
    a.x -= wA * cx;
    a.y -= wA * cy;
    a.z -= wA * cz;
  }

  if (wB > 0) {
    b.x += wB * cx;
    b.y += wB * cy;
    b.z += wB * cz;
  }
}

interface NeighborCandidate {
  index: number;
  distSq: number;
}

/** Build distance links between nearby rest positions ( capped neighbors per particle ). */
export function buildProximityConstraints(
  restPositions: [number, number, number][],
  linkRadius: number,
  maxNeighbors = 6,
): DistanceConstraint[] {
  const constraints: DistanceConstraint[] = [];
  const radiusSq = linkRadius * linkRadius;
  const seen = new Set<string>();

  for (let i = 0; i < restPositions.length; i += 1) {
    const neighbors: NeighborCandidate[] = [];
    const [ax, ay, az] = restPositions[i];

    for (let j = 0; j < restPositions.length; j += 1) {
      if (i === j) continue;

      const [bx, by, bz] = restPositions[j];
      const dx = bx - ax;
      const dy = by - ay;
      const dz = bz - az;
      const distSq = dx * dx + dy * dy + dz * dz;

      if (distSq > radiusSq || distSq < 1e-10) {
        continue;
      }

      neighbors.push({ index: j, distSq });
    }

    neighbors.sort((a, b) => a.distSq - b.distSq);
    const linked = neighbors.slice(0, maxNeighbors);

    for (const neighbor of linked) {
      const lo = Math.min(i, neighbor.index);
      const hi = Math.max(i, neighbor.index);
      const key = `${lo}:${hi}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);

      constraints.push({
        i: lo,
        j: hi,
        restLength: Math.sqrt(neighbor.distSq),
        compliance: 1e-6,
      });
    }
  }

  return constraints;
}
