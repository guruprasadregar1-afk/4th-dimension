import { describe, expect, it } from 'vitest';
import { generateAsymmetricSimplex5Geometry } from './polytopeGeometry';
import {
  computeCanonicalHyperplaneBasis,
  slicePolytopeHyperplane,
  verifyMeshConvexity,
  type Hyperplane4D,
} from './hyperplaneSlicer';

/** Helper to compute 3D volume of a tetrahedron given 4 3D vertices */
function computeTetrahedronVolume3D(v: Array<[number, number, number]>): number {
  if (v.length !== 4) return 0;
  const [a, b, c, d] = v;
  const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const ac = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const ad = [d[0] - a[0], d[1] - a[1], d[2] - a[2]];

  const cross = [
    ac[1] * ad[2] - ac[2] * ad[1],
    ac[2] * ad[0] - ac[0] * ad[2],
    ac[0] * ad[1] - ac[1] * ad[0],
  ];

  const dot = ab[0] * cross[0] + ab[1] * cross[1] + ab[2] * cross[2];
  return Math.abs(dot) / 6;
}

describe('Experiment 006: Irregular 4D Polytope Slicing Test Suite', () => {
  it('TC-M6-01: Asymmetric 4-Simplex Generator creates valid 5-cell topology', () => {
    const simplex = generateAsymmetricSimplex5Geometry();
    expect(simplex.vertices.length).toBe(5);
    expect(simplex.edges.length).toBe(10);
    expect(simplex.cells.length).toBe(5);

    // Verify asymmetric peak vertex at w = 5
    expect(simplex.vertices[4]).toEqual([1, 1, 1, 5]);
  });

  it('TC-M6-02: Case 1 Axis-Aligned Hyperplane (w = 2.5) matches analytical ground truth', () => {
    const simplex = generateAsymmetricSimplex5Geometry();
    const plane: Hyperplane4D = { normal: [0, 0, 0, 1], offset: 2.5 };

    const mesh = slicePolytopeHyperplane(simplex, plane);

    expect(mesh.vertexCount).toBe(4);
    expect(mesh.faceCount).toBe(4);
    expect(mesh.isConvex).toBe(true);
    expect(mesh.isClosed).toBe(true);

    // Expected 4D vertices: P0(0.5,0.5,0.5,2.5), P1(1.5,0.5,0.5,2.5), P2(0.5,2.0,0.5,2.5), P3(0.5,0.5,2.5,2.5)
    const expectedPoints = [
      [0.5, 0.5, 0.5, 2.5],
      [1.5, 0.5, 0.5, 2.5],
      [0.5, 2.0, 0.5, 2.5],
      [0.5, 0.5, 2.5, 2.5],
    ];

    for (const expPt of expectedPoints) {
      const match = mesh.vertices.some(
        (v) =>
          Math.abs(v[0] - expPt[0]) < 1e-5 &&
          Math.abs(v[1] - expPt[1]) < 1e-5 &&
          Math.abs(v[2] - expPt[2]) < 1e-5 &&
          Math.abs(v[3] - expPt[3]) < 1e-5,
      );
      expect(match).toBe(true);
    }

    // Verify exact analytical volume = 0.500000
    const vol = computeTetrahedronVolume3D(mesh.vertices3D);
    expect(vol).toBeCloseTo(0.5, 5);
  });

  it('TC-M6-03: Case 2 Oblique Hyperplane (x+y+z+w = 2.0) matches analytical ground truth & isometric chart distances', () => {
    const simplex = generateAsymmetricSimplex5Geometry();
    const plane: Hyperplane4D = { normal: [1, 1, 1, 1], offset: 2.0 };

    const mesh = slicePolytopeHyperplane(simplex, plane);

    expect(mesh.vertexCount).toBe(4);
    expect(mesh.faceCount).toBe(4);
    expect(mesh.isConvex).toBe(true);
    expect(mesh.isClosed).toBe(true);

    // Expected 4D vertices: Q0(2,0,0,0), Q1(0,2,0,0), Q2(0,0,2,0), Q3(0.25,0.25,0.25,1.25)
    const expectedPoints = [
      [2, 0, 0, 0],
      [0, 2, 0, 0],
      [0, 0, 2, 0],
      [0.25, 0.25, 0.25, 1.25],
    ];

    for (const expPt of expectedPoints) {
      const match = mesh.vertices.some(
        (v) =>
          Math.abs(v[0] - expPt[0]) < 1e-5 &&
          Math.abs(v[1] - expPt[1]) < 1e-5 &&
          Math.abs(v[2] - expPt[2]) < 1e-5 &&
          Math.abs(v[3] - expPt[3]) < 1e-5,
      );
      expect(match).toBe(true);
    }

    // Verify 3D isometric chart edge lengths match true 4D edge lengths exactly
    const dist3D = (i: number, j: number) => {
      const p1 = mesh.vertices3D[i];
      const p2 = mesh.vertices3D[j];
      return Math.hypot(p1[0] - p2[0], p1[1] - p2[1], p1[2] - p2[2]);
    };

    const dist4D = (i: number, j: number) => {
      const p1 = mesh.vertices[i];
      const p2 = mesh.vertices[j];
      return Math.hypot(p1[0] - p2[0], p1[1] - p2[1], p1[2] - p2[2], p1[3] - p2[3]);
    };

    for (let i = 0; i < mesh.vertices.length; i++) {
      for (let j = i + 1; j < mesh.vertices.length; j++) {
        expect(dist3D(i, j)).toBeCloseTo(dist4D(i, j), 5);
      }
    }

    // Verify exact analytical volume = 5/3 approx 1.666667
    const vol = computeTetrahedronVolume3D(mesh.vertices3D);
    expect(vol).toBeCloseTo(5 / 3, 5);
  });

  it('TC-M6-04: Out of bounds slice at w = 6.0 produces empty mesh without error', () => {
    const simplex = generateAsymmetricSimplex5Geometry();
    const plane: Hyperplane4D = { normal: [0, 0, 0, 1], offset: 6.0 };

    const mesh = slicePolytopeHyperplane(simplex, plane);

    expect(mesh.vertexCount).toBe(0);
    expect(mesh.faceCount).toBe(0);
    expect(mesh.shapeName).toContain('Empty');
  });

  it('TC-M6-05: Concave/distorted geometry is correctly rejected by verifyMeshConvexity', () => {
    const concaveSimplexVerts: Array<[number, number, number, number]> = [
      [0, 0, 0, 0],
      [2, 0, 0, 0],
      [0, 3, 0, 0],
      [0, 0, 4, 0],
      [-0.5, -0.5, -0.5, 0], // Vertices lie on opposite sides of base face (z=0 plane separating v3 and v4)
    ];
    const faces = [
      [0, 1, 2],
      [0, 1, 3],
      [0, 2, 3],
      [1, 2, 3],
    ];

    expect(verifyMeshConvexity(concaveSimplexVerts, faces)).toBe(false);
  });

  it('TC-M6-06: Frame-to-frame basis continuity test over continuous hyperplane sweep', () => {
    const numSteps = 50;
    let prevBasis: [
      [number, number, number, number],
      [number, number, number, number],
      [number, number, number, number],
    ] | null = null;

    for (let step = 0; step <= numSteps; step++) {
      const t = (step / numSteps) * Math.PI;
      const nx = Math.cos(t);
      const ny = Math.sin(t);
      const plane: Hyperplane4D = { normal: [nx, ny, 0.5, 0.5], offset: 1.0 };

      const basis = computeCanonicalHyperplaneBasis(plane);

      if (prevBasis) {
        for (let m = 0; m < 3; m++) {
          const diff = Math.hypot(
            basis[m][0] - prevBasis[m][0],
            basis[m][1] - prevBasis[m][1],
            basis[m][2] - prevBasis[m][2],
            basis[m][3] - prevBasis[m][3],
          );
          // Assert smooth motion with zero frame jumps or sign flips
          expect(diff).toBeLessThan(0.1);
        }
      }

      prevBasis = basis;
    }
  });
});
