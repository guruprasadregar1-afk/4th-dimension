import { describe, expect, it } from 'vitest';
import {
  generateCube3DGeometry,
  generateOrthoplex16Geometry,
  generateSimplex5Geometry,
  generateTesseractGeometry,
} from './polytopeGeometry';

function dist4D(
  v1: [number, number, number, number],
  v2: [number, number, number, number],
): number {
  const dx = v1[0] - v2[0];
  const dy = v1[1] - v2[1];
  const dz = v1[2] - v2[2];
  const dw = v1[3] - v2[3];
  return Math.hypot(dx, dy, dz, dw);
}

describe('Polytope Geometry Generators', () => {
  describe('Tesseract (8-cell)', () => {
    it('generates exactly 16 vertices and 32 edges', () => {
      const geo = generateTesseractGeometry();
      expect(geo.vertices).toHaveLength(16);
      expect(geo.edges).toHaveLength(32);
    });

    it('asserts every edge connects vertices at 4D distance 2.0', () => {
      const geo = generateTesseractGeometry();
      for (const [i, j] of geo.edges) {
        const d = dist4D(geo.vertices[i], geo.vertices[j]);
        expect(d).toBeCloseTo(2.0, 5);
      }
    });
  });

  describe('5-cell (4-simplex)', () => {
    it('generates exactly 5 vertices and 10 edges', () => {
      const geo = generateSimplex5Geometry();
      expect(geo.vertices).toHaveLength(5);
      expect(geo.edges).toHaveLength(10);
    });

    it('asserts every edge connects vertices at uniform 4D distance sqrt(8)', () => {
      const geo = generateSimplex5Geometry();
      const expectedDist = Math.sqrt(8); // ≈ 2.828427
      for (const [i, j] of geo.edges) {
        const d = dist4D(geo.vertices[i], geo.vertices[j]);
        expect(d).toBeCloseTo(expectedDist, 5);
      }
    });
  });

  describe('16-cell (4-orthoplex)', () => {
    it('generates exactly 8 vertices and 24 edges', () => {
      const geo = generateOrthoplex16Geometry();
      expect(geo.vertices).toHaveLength(8);
      expect(geo.edges).toHaveLength(24);
    });

    it('asserts every edge connects vertices at 4D distance sqrt(2)', () => {
      const geo = generateOrthoplex16Geometry();
      const expectedDist = Math.sqrt(2); // ≈ 1.414213
      for (const [i, j] of geo.edges) {
        const d = dist4D(geo.vertices[i], geo.vertices[j]);
        expect(d).toBeCloseTo(expectedDist, 5);
      }
    });

    it('asserts no edge connects a vertex to its antipode', () => {
      const geo = generateOrthoplex16Geometry();
      for (const [i, j] of geo.edges) {
        const v1 = geo.vertices[i];
        const v2 = geo.vertices[j];
        // Antipodal vertices sum to (0,0,0,0) and have distance 2.0
        const isAntipode =
          v1[0] === -v2[0] &&
          v1[1] === -v2[1] &&
          v1[2] === -v2[2] &&
          v1[3] === -v2[3];
        expect(isAntipode).toBe(false);
      }
    });
  });

  describe('3D Reference Cube', () => {
    it('generates exactly 8 vertices and 12 edges', () => {
      const geo = generateCube3DGeometry();
      expect(geo.vertices).toHaveLength(8);
      expect(geo.edges).toHaveLength(12);
    });
  });
});
