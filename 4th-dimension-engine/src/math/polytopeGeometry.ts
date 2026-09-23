export interface PolytopeCell4D {
  name?: string;
  vertices: number[];
  faces: Array<number[]>;
}

export interface PolytopeGeometry4D {
  name: string;
  description: string;
  vertices: Array<[number, number, number, number]>;
  edges: Array<[number, number]>;
  cells: PolytopeCell4D[];
}

export interface PolytopeGeometry3D {
  name: string;
  vertices: Array<[number, number, number]>;
  edges: Array<[number, number]>;
}

/**
 * 4D Hypercube (Tesseract / 8-cell).
 * 16 vertices: (+-1, +-1, +-1, +-1)
 * 32 edges: pairs differing in exactly 1 coordinate
 * 8 cubic cells: corresponding to fixed x, y, z, w = +-1
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

  // Define 8 cubic 3D cells (fixed coordinate bit = 0 or 1)
  const cells: PolytopeCell4D[] = [];
  const dimensions = ['x', 'y', 'z', 'w'];

  for (let dim = 0; dim < 4; dim++) {
    const bitMask = 1 << dim;

    for (const val of [0, bitMask]) {
      const cellVertices = [];
      for (let i = 0; i < 16; i++) {
        if ((i & bitMask) === val) {
          cellVertices.push(i);
        }
      }

      // Build the 6 square faces for this cubic cell
      const faces: Array<number[]> = [];
      const otherDims = [0, 1, 2, 3].filter((d) => d !== dim);

      for (let f1 = 0; f1 < otherDims.length; f1++) {
        const d1 = otherDims[f1];
        const mask1 = 1 << d1;
        const varyingDims = otherDims.filter((d) => d !== d1);
        const d2 = varyingDims[0];
        const d3 = varyingDims[1];
        const mask2 = 1 << d2;
        const mask3 = 1 << d3;

        for (const v1 of [0, mask1]) {
          const faceVerts = cellVertices.filter((v) => (v & mask1) === v1);
          const v00 = faceVerts.find((v) => !(v & mask2) && !(v & mask3))!;
          const v10 = faceVerts.find((v) => (v & mask2) && !(v & mask3))!;
          const v11 = faceVerts.find((v) => (v & mask2) && (v & mask3))!;
          const v01 = faceVerts.find((v) => !(v & mask2) && (v & mask3))!;

          // Deduplicate square face
          const faceCandidate = [v00, v10, v11, v01];
          const sorted = [...faceCandidate].sort((a, b) => a - b).join(',');
          const exists = faces.some(
            (f) => [...f].sort((a, b) => a - b).join(',') === sorted,
          );
          if (!exists) {
            faces.push(faceCandidate);
          }
        }
      }

      const signStr = val === 0 ? '-1' : '+1';
      cells.push({
        name: `Cube Cell (${dimensions[dim]} = ${signStr})`,
        vertices: cellVertices,
        faces,
      });
    }
  }

  return {
    name: 'Tesseract (8-cell)',
    description: '16 vertices • 32 edges • 8 cubic cells',
    vertices,
    edges,
    cells,
  };
}

/**
 * 4D Simplex (5-cell / 4-simplex).
 * 5 vertices, 10 edges, 5 tetrahedral cells (omitting 1 vertex per cell)
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

  // Define 5 tetrahedral cells (each cell omits vertex omitIdx)
  const cells: PolytopeCell4D[] = [];
  for (let omitIdx = 0; omitIdx < 5; omitIdx++) {
    const cellVertices = [0, 1, 2, 3, 4].filter((idx) => idx !== omitIdx);
    const faces: Array<number[]> = [
      [cellVertices[0], cellVertices[1], cellVertices[2]],
      [cellVertices[0], cellVertices[1], cellVertices[3]],
      [cellVertices[0], cellVertices[2], cellVertices[3]],
      [cellVertices[1], cellVertices[2], cellVertices[3]],
    ];

    cells.push({
      name: `Tetrahedron Cell (omitting v${omitIdx})`,
      vertices: cellVertices,
      faces,
    });
  }

  return {
    name: '5-cell (4-simplex)',
    description: '5 vertices • 10 edges • 5 tetrahedral cells',
    vertices,
    edges,
    cells,
  };
}

/**
 * 4D Orthoplex (16-cell / 4-cross-polytope).
 * 8 vertices (antipodal pairs), 24 edges, 16 tetrahedral cells
 */
export function generateOrthoplex16Geometry(): PolytopeGeometry4D {
  const vertices: Array<[number, number, number, number]> = [
    [1, 0, 0, 0],   // 0
    [-1, 0, 0, 0],  // 1
    [0, 1, 0, 0],   // 2
    [0, -1, 0, 0],  // 3
    [0, 0, 1, 0],   // 4
    [0, 0, -1, 0],  // 5
    [0, 0, 0, 1],   // 6
    [0, 0, 0, -1],  // 7
  ];

  const edges: Array<[number, number]> = [];
  for (let i = 0; i < 8; i++) {
    for (let j = i + 1; j < 8; j++) {
      const isAntipode = (i ^ 1) === j;
      if (!isAntipode) {
        edges.push([i, j]);
      }
    }
  }

  // 16 tetrahedral cells: pick 1 vertex from each of the 4 antipodal pairs (0/1, 2/3, 4/5, 6/7)
  const cells: PolytopeCell4D[] = [];
  for (let c0 = 0; c0 <= 1; c0++) {
    for (let c1 = 2; c1 <= 3; c1++) {
      for (let c2 = 4; c2 <= 5; c2++) {
        for (let c3 = 6; c3 <= 7; c3++) {
          const cellVertices = [c0, c1, c2, c3];
          const faces: Array<number[]> = [
            [c0, c1, c2],
            [c0, c1, c3],
            [c0, c2, c3],
            [c1, c2, c3],
          ];

          cells.push({
            name: `16-Cell Tetrahedral Cell [${cellVertices.join(',')}]`,
            vertices: cellVertices,
            faces,
          });
        }
      }
    }
  }

  return {
    name: '16-cell (4-orthoplex)',
    description: '8 vertices • 24 edges • 16 tetrahedral cells',
    vertices,
    edges,
    cells,
  };
}

/**
 * 3D Reference Cube Geometry.
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
