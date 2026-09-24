// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';

// Import pure math entrypoint & subpaths
import {
  classifyCrossSectionShape,
  generateAsymmetricSimplex5Geometry,
  generateTesseractGeometry,
} from '../index';
import { generateSimplex5Geometry } from '../geometry';
import {
  computeCanonicalHyperplaneBasis,
  slicePolytopeHyperplane,
  verifyMeshConvexity,
  type Hyperplane4D,
} from '../slicing';
import { rotatePrimitive4D } from '../mathExport';

describe('STEP 3: Browser DOM/WebGL Zero-Leakage Verification (JSDOM Environment)', () => {
  it('Importing & executing math/geometry/slicing modules in a browser environment with NO WebGL context triggers zero WebGL calls or warnings', () => {
    // 1. Mock HTMLCanvasElement.prototype.getContext to throw if invoked
    const getContextSpy = vi.fn().mockImplementation((contextId: string) => {
      if (contextId.includes('webgl')) {
        throw new Error('LEAK DETECTED: Canvas getContext("webgl/webgl2") was called by pure math package!');
      }
      return null;
    });

    if (typeof window !== 'undefined' && window.HTMLCanvasElement) {
      window.HTMLCanvasElement.prototype.getContext = getContextSpy as any;
    }

    // 2. Spy on console.warn and console.error to catch capability warnings
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // 3. Execute polytope geometry generators
    const asymmetricSimplex = generateAsymmetricSimplex5Geometry();
    const tesseract = generateTesseractGeometry();
    const simplex = generateSimplex5Geometry();

    expect(asymmetricSimplex.vertices.length).toBe(5);
    expect(tesseract.vertices.length).toBe(16);
    expect(simplex.vertices.length).toBe(5);

    // 4. Execute hyperplane slicing & canonical basis math
    const planeOblique: Hyperplane4D = { normal: [1, 1, 1, 1], offset: 2.0 };
    const slicedMesh = slicePolytopeHyperplane(asymmetricSimplex, planeOblique);
    const basis = computeCanonicalHyperplaneBasis(planeOblique);

    expect(slicedMesh.vertexCount).toBe(4);
    expect(slicedMesh.isConvex).toBe(true);
    expect(slicedMesh.isClosed).toBe(true);
    expect(basis.length).toBe(3);

    // Verify verification helper and classification function
    expect(verifyMeshConvexity(slicedMesh.vertices, slicedMesh.faces)).toBe(true);
    expect(classifyCrossSectionShape(4, 4)).toBe('Tetrahedron');

    // 5. Execute 4D rotation math
    const rotated = rotatePrimitive4D(
      { mean: [1, 1, 1, 1], covariance: new Float32Array(16), color: [1, 1, 1, 1], alpha: 1 },
      { xw: 0.5, yw: 0, zw: 0 },
    );
    expect(rotated.mean[3]).toBeDefined();

    // 7. ASSERT: Zero canvas getContext calls, zero WebGL warnings/errors
    expect(getContextSpy).toHaveBeenCalledTimes(0);
    expect(warnSpy).toHaveBeenCalledTimes(0);
    expect(errorSpy).toHaveBeenCalledTimes(0);

    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
