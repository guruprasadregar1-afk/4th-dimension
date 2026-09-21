export interface PolytopeGeometry4D {
  name: string;
  description: string;
  vertices: Array<[number, number, number, number]>;
  edges: Array<[number, number]>;
}

export interface PolytopeGeometry3D {
  name: string;
  vertices: Array<[number, number, number]>;
  edges: Array<[number, number]>;
}

/**
 * 4D Hypercube (Tesseract / 8-cell).
 * 16 vertices: (+-1, +-1, +-1, +-1)
 * 32 edges: pairs differing in exactly 1 coordinate (Hamming distance 1)
 * 4D edge length: 2.0
 */
export function generateTesseractGeometry(): PolytopeGeometry4D {
  const vertices: Array<[number, number, number, number]> = [];
  for (let i = 0; i < 16; i++) {
    vertices.push([
      i & 1 ? 1 : -1,
      i & 2 ? 1 : -1,
      i & 4 ? 1 : -1,
      i & 8 ? 1 : -1,
    ]);
  }

  const edges: Array<[number, number]> = [];
  for (let i = 0; i < 16; i++) {
    for (let j = i + 1; j < 16; j++) {
      const diff = i ^ j;
      if ((diff & (diff - 1)) === 0) {
        edges.push([i, j]);
      }
    }
  }

  return {
    name: 'Tesseract (8-cell)',
    description: '16 vertices · 32 edges · 4D Hypercube',
    vertices,
    edges,
  };
}

/**
 * 4D Simplex (5-cell / 4-simplex).
 * 5 vertices: regular 4-simplex in 4D
 * 10 edges: complete graph K5 (every vertex connected to every other vertex)
 * 4D edge length: sqrt(8) ≈ 2.8284
 */
export function generateSimplex5Geometry(): PolytopeGeometry4D {
  const sqrt5 = Math.sqrt(5);
  const vertices: Array<[number, number, number, number]> = [
    [1, 1, 1, -1 / sqrt5],
    [1, -1, -1, -1 / sqrt5],
    [-1, 1, -1, -1 / sqrt5],
    [-1, -1, 1, -1 / sqrt5],
    [0, 0, 0, sqrt5 - 1 / sqrt5],
  ];

  const edges: Array<[number, number]> = [];
  for (let i = 0; i < 5; i++) {
    for (let j = i + 1; j < 5; j++) {
      edges.push([i, j]);
    }
  }

  return {
    name: '5-cell (4-simplex)',
    description: '5 vertices · 10 edges · Simplest 4D Polytope',
    vertices,
    edges,
  };
}

/**
 * 4D Orthoplex (16-cell / 4-cross-polytope).
 * 8 vertices: (+-1,0,0,0), (0,+-1,0,0), (0,0,+-1,0), (0,0,0,+-1)
 * 24 edges: connects all pairs EXCEPT antipodes (opposite coordinate poles)
 * 4D edge length: sqrt(2) ≈ 1.4142
 */
export function generateOrthoplex16Geometry(): PolytopeGeometry4D {
  const vertices: Array<[number, number, number, number]> = [
    [1, 0, 0, 0],
    [-1, 0, 0, 0],
    [0, 1, 0, 0],
    [0, -1, 0, 0],
    [0, 0, 1, 0],
    [0, 0, -1, 0],
    [0, 0, 0, 1],
    [0, 0, 0, -1],
  ];

  const edges: Array<[number, number]> = [];
  for (let i = 0; i < 8; i++) {
    for (let j = i + 1; j < 8; j++) {
      // Antipodes occur at pairs (0,1), (2,3), (4,5), (6,7) where j == i^1
      const isAntipode = (i ^ 1) === j;
      if (!isAntipode) {
        edges.push([i, j]);
      }
    }
  }

  return {
    name: '16-cell (4-orthoplex)',
    description: '8 vertices · 24 edges · 4D Octahedron Analogue',
    vertices,
    edges,
  };
}

/**
 * 3D Reference Cube Geometry.
 * 8 vertices: (+-1, +-1, +-1)
 * 12 edges: pairs differing in 1 coordinate
 */
export function generateCube3DGeometry(): PolytopeGeometry3D {
  const vertices: Array<[number, number, number]> = [];
  for (let i = 0; i < 8; i++) {
    vertices.push([
      i & 1 ? 1 : -1,
      i & 2 ? 1 : -1,
      i & 4 ? 1 : -1,
    ]);
  }

  const edges: Array<[number, number]> = [];
  for (let i = 0; i < 8; i++) {
    for (let j = i + 1; j < 8; j++) {
      const diff = i ^ j;
      if ((diff & (diff - 1)) === 0) {
        edges.push([i, j]);
      }
    }
  }

  return {
    name: '3D Cube (Control)',
    vertices,
    edges,
  };
}
