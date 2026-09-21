import { describe, expect, it } from 'vitest';

function rotatePoint3D(
  p: [number, number, number],
  azimuth: number,
  elevation: number,
): [number, number, number] {
  let [x, y, z] = p;
  const cosY = Math.cos(azimuth);
  const sinY = Math.sin(azimuth);
  const nx = x * cosY + z * sinY;
  const nz = -x * sinY + z * cosY;
  x = nx;
  z = nz;

  const cosX = Math.cos(elevation);
  const sinX = Math.sin(elevation);
  const ny = y * cosX - z * sinX;
  const nz2 = y * sinX + z * cosX;
  y = ny;
  z = nz2;
  return [x, y, z];
}

function computePairwiseStretchRatio(
  points: Array<[number, number, number]>,
  edges: Array<[number, number]>,
  azimuth: number,
  elevation: number,
) {
  let minUnrotated = Infinity, maxUnrotated = -Infinity;
  let minRotated = Infinity, maxRotated = -Infinity;

  const rotatedPoints = points.map((p) => rotatePoint3D(p, azimuth, elevation));

  for (const [i, j] of edges) {
    const u1 = points[i];
    const u2 = points[j];
    const dUnrotated = Math.hypot(u1[0] - u2[0], u1[1] - u2[1], u1[2] - u2[2]);
    minUnrotated = Math.min(minUnrotated, dUnrotated);
    maxUnrotated = Math.max(maxUnrotated, dUnrotated);

    const r1 = rotatedPoints[i];
    const r2 = rotatedPoints[j];
    const dRotated = Math.hypot(r1[0] - r2[0], r1[1] - r2[1], r1[2] - r2[2]);
    minRotated = Math.min(minRotated, dRotated);
    maxRotated = Math.max(maxRotated, dRotated);
  }

  const unrotatedRatio = maxUnrotated / minUnrotated;
  const rotatedRatio = maxRotated / minRotated;
  const stretchRatio = rotatedRatio / unrotatedRatio;

  return { minRotated, maxRotated, stretchRatio };
}

describe('Pairwise Distance 3D Rotation Invariance Test', () => {
  const sampleStaticPrimitives: Array<[number, number, number]> = [
    [-1.76, -0.55, -2.82],
    [1.34, 0.49, 1.17],
    [-2.50, -2.41, -1.10],
    [0.71, 1.29, 2.55],
    [-1.47, -0.95, -1.37],
    [2.79, 0.06, 2.25],
  ];

  const samplePairs: Array<[number, number]> = [
    [0, 1], [0, 2], [1, 3], [2, 4], [3, 5], [4, 5]
  ];

  it('asserts that pairwise-distance stretch ratio remains 1.000x across multiple non-zero 3D rotation angles', () => {
    const rotationAngles = [
      { azimuth: 0.1, elevation: 0.2 },
      { azimuth: 0.5, elevation: 0.8 },
      { azimuth: 1.2, elevation: 1.5 },
      { azimuth: 2.5, elevation: 3.1 },
    ];

    for (const rot of rotationAngles) {
      const res = computePairwiseStretchRatio(
        sampleStaticPrimitives,
        samplePairs,
        rot.azimuth,
        rot.elevation,
      );

      expect(res.stretchRatio).toBeCloseTo(1.000, 5);
    }
  });
});
