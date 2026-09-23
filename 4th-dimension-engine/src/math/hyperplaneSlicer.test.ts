import { describe, expect, it } from 'vitest';
import {
  generateOrthoplex16Geometry,
  generateSimplex5Geometry,
  generateTesseractGeometry,
} from './polytopeGeometry';
import {
  intersectEdgeHyperplane,
  signDistance4D,
  slicePolytopeHyperplane,
  verifyFaceCoplanarity,
  verifyMeshCongruence,
  verifyMeshConvexity,
  type Hyperplane4D,
} from './hyperplaneSlicer';

describe('Sprint M1: Polytope Cell Structure Data Model', () => {
  it('TC-M1-01: Tesseract generator returns 8 cubic cells (8 vertices per cell)', () => {
    const tesseract = generateTesseractGeometry();
    expect(tesseract.cells).toBeDefined();
    expect(tesseract.cells.length).toBe(8);

    for (const cell of tesseract.cells) {
      expect(cell.vertices.length).toBe(8);
      expect(cell.faces.length).toBe(6);
      for (const face of cell.faces) {
        expect(face.length).toBe(4);
      }
    }
  });

  it('TC-M1-02: For every cell, all cell edges exist in global edge list', () => {
    const polytopes = [
      generateTesseractGeometry(),
      generateSimplex5Geometry(),
      generateOrthoplex16Geometry(),
    ];

    for (const polytope of polytopes) {
      const globalEdgeKeys = new Set(
        polytope.edges.map(([u, v]) => (u < v ? `${u}-${v}` : `${v}-${u}`)),
      );

      for (const cell of polytope.cells) {
        for (const face of cell.faces) {
          for (let k = 0; k < face.length; k++) {
            const u = face[k];
            const v = face[(k + 1) % face.length];
            const key = u < v ? `${u}-${v}` : `${v}-${u}`;
            expect(globalEdgeKeys.has(key)).toBe(true);
          }
        }
      }
    }
  });

  it('TC-M1-03: Existing vertex and edge outputs maintain 100% backward compatibility', () => {
    const tesseract = generateTesseractGeometry();
    expect(tesseract.vertices.length).toBe(16);
    expect(tesseract.edges.length).toBe(32);

    const simplex = generateSimplex5Geometry();
    expect(simplex.vertices.length).toBe(5);
    expect(simplex.edges.length).toBe(10);

    const orthoplex = generateOrthoplex16Geometry();
    expect(orthoplex.vertices.length).toBe(8);
    expect(orthoplex.edges.length).toBe(24);
  });
});

describe('Sprint M2: Hyperplane-Edge Intersection Algorithm', () => {
  it('TC-M2-01: Correctly calculates exact intersection point for crossed edge', () => {
    const plane: Hyperplane4D = { normal: [1, 1, 1, 1], offset: 0 };
    const p1: [number, number, number, number] = [-1, -1, -1, -1]; // sum = -4
    const p2: [number, number, number, number] = [1, 1, 1, 1];     // sum = +4

    const res = intersectEdgeHyperplane(p1, p2, plane);
    expect(res.type).toBe('INTERSECTION');
    expect(res.point).toBeDefined();
    expect(res.t).toBeCloseTo(0.5);
    expect(signDistance4D(res.point!, plane)).toBeCloseTo(0);
  });

  it('TC-M2-02: Returns NONE for edge entirely on one side of hyperplane', () => {
    const plane: Hyperplane4D = { normal: [1, 0, 0, 0], offset: 5 };
    const p1: [number, number, number, number] = [0, 0, 0, 0];
    const p2: [number, number, number, number] = [1, 1, 1, 1];

    const res = intersectEdgeHyperplane(p1, p2, plane);
    expect(res.type).toBe('NONE');
    expect(res.point).toBeUndefined();
  });

  it('TC-M2-03: Handles vertex exactly on hyperplane without crash or NaN', () => {
    const plane: Hyperplane4D = { normal: [1, 0, 0, 0], offset: 1 };
    const p1: [number, number, number, number] = [1, 0, 0, 0]; // sum = 1
    const p2: [number, number, number, number] = [2, 0, 0, 0]; // sum = 2

    const res = intersectEdgeHyperplane(p1, p2, plane);
    expect(res.type).toBe('VERTEX');
    expect(res.point).toEqual(p1);
  });

  it('TC-M2-04: Handles edge lying entirely within hyperplane (ON_PLANE)', () => {
    const plane: Hyperplane4D = { normal: [0, 0, 0, 1], offset: 1 };
    const p1: [number, number, number, number] = [0, 0, 0, 1];
    const p2: [number, number, number, number] = [1, 1, 1, 1];

    const res = intersectEdgeHyperplane(p1, p2, plane);
    expect(res.type).toBe('ON_PLANE');
    expect(res.point).toEqual(p1);
    expect(res.point2).toEqual(p2);
  });
});

describe('Sprint M3: Cross-Section Polygon & Mesh Assembly', () => {
  it('TC-M3-01: Unit tesseract sliced at t=0.5 (main diagonal) yields a tetrahedron', () => {
    const tesseract = generateUnitTesseract();
    const plane: Hyperplane4D = { normal: [1, 1, 1, 1], offset: 0.5 };

    const mesh = slicePolytopeHyperplane(tesseract, plane);
    expect(mesh.vertexCount).toBe(4);
    expect(mesh.shapeName).toContain('Tetrahedron');
    expect(mesh.isConvex).toBe(true);
  });

  it('TC-M3-02: Unit tesseract sliced at t=2.0 (main diagonal) yields an octahedron', () => {
    const tesseract = generateUnitTesseract();
    const plane: Hyperplane4D = { normal: [1, 1, 1, 1], offset: 2.0 };

    const mesh = slicePolytopeHyperplane(tesseract, plane);
    expect(mesh.vertexCount).toBe(6);
    expect(mesh.shapeName).toContain('Octahedron');
    expect(mesh.isConvex).toBe(true);
  });

  it('TC-M3-03: Verifies real coplanarity of face vertices within 1e-6', () => {
    const tesseract = generateTesseractGeometry();
    const plane: Hyperplane4D = { normal: [1, 0, 0, 1], offset: 0.5 };

    const mesh = slicePolytopeHyperplane(tesseract, plane);
    expect(mesh.isCoplanarFaces).toBe(true);

    // Assert that a perturbed non-coplanar face returns false
    const badVertices: Array<[number, number, number, number]> = [
      [0, 0, 0, 0],
      [1, 0, 0, 0],
      [1, 1, 0, 0],
      [0, 1, 0.5, 0], // perturbed Z
    ];
    const badFaces = [[0, 1, 2, 3]];
    expect(verifyFaceCoplanarity(badVertices, badFaces)).toBe(false);
  });

  it('TC-M3-04: Verifies output mesh is closed and watertight across sliced range', () => {
    const tesseract = generateUnitTesseract();
    const offsets = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5];

    for (const offset of offsets) {
      const plane: Hyperplane4D = { normal: [1, 1, 1, 1], offset };
      const mesh = slicePolytopeHyperplane(tesseract, plane);
      expect(mesh.isClosed).toBe(true);
      expect(mesh.isConvex).toBe(true);
    }
  });

  it('Verifies real 3D half-space convexity test fails on concave vertex perturbation', () => {
    const cubeVerts: Array<[number, number, number, number]> = [
      [0, 0, 0, 0], [1, 0, 0, 0], [1, 1, 0, 0], [0, 1, 0, 0],
      [0, 0, 1, 0], [1, 0, 1, 0], [1, 1, 1, 0], [0, 1, 1, 0],
      [0.5, 0.5, -0.5, 0], // Concave inward dent point
    ];
    const faces = [
      [0, 1, 2, 3],
      [4, 5, 6, 7],
      [0, 1, 5, 4],
      [2, 3, 7, 6],
      [0, 3, 7, 4],
      [1, 2, 6, 5],
    ];
    expect(verifyMeshConvexity(cubeVerts, faces)).toBe(false);
  });

  it('Verifies verifyMeshCongruence compares multiset edge lengths within tolerance', () => {
    const tesseract = generateUnitTesseract();
    const plane1: Hyperplane4D = { normal: [1, 1, 1, 1], offset: 1.5 };
    const plane2: Hyperplane4D = { normal: [1, 1, 1, 1], offset: 2.5 };

    const mesh1 = slicePolytopeHyperplane(tesseract, plane1);
    const mesh2 = slicePolytopeHyperplane(tesseract, plane2);

    expect(verifyMeshCongruence(mesh1, mesh2)).toBe(true);
  });
});

function generateUnitTesseract() {
  const geom = generateTesseractGeometry();
  // Map vertices from [-1,1]^4 to [0,1]^4 for main-diagonal slice x+y+z+w = t
  geom.vertices = geom.vertices.map((v) => [
    (v[0] + 1) / 2,
    (v[1] + 1) / 2,
    (v[2] + 1) / 2,
    (v[3] + 1) / 2,
  ]);
  return geom;
}
