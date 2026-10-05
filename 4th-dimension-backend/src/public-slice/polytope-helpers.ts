import { PolytopeCell4D, PolytopeGeometry4D } from '@4th-dimension/engine';

export function generate24CellGeometry(): PolytopeGeometry4D {
  const vertices: Array<[number, number, number, number]> = [];

  // 1. 8 permutations of (+-1, 0, 0, 0)
  for (let dim = 0; dim < 4; dim++) {
    for (const sign of [1, -1]) {
      const v: [number, number, number, number] = [0, 0, 0, 0];
      v[dim] = sign;
      vertices.push(v);
    }
  }

  // 2. 16 hypercube vertices of (+-0.5, +-0.5, +-0.5, +-0.5)
  for (let i = 0; i < 16; i++) {
    vertices.push([
      i & 1 ? 0.5 : -0.5,
      i & 2 ? 0.5 : -0.5,
      i & 4 ? 0.5 : -0.5,
      i & 8 ? 0.5 : -0.5,
    ]);
  }

  const dist = (a: number[], b: number[]) =>
    Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2], a[3] - b[3]);

  // 3. 96 Edges (distance = 1.0)
  const edges: Array<[number, number]> = [];
  const edgeSet = new Set<string>();

  for (let i = 0; i < 24; i++) {
    for (let j = i + 1; j < 24; j++) {
      if (Math.abs(dist(vertices[i], vertices[j]) - 1.0) < 1e-4) {
        edges.push([i, j]);
        edgeSet.add(`${i},${j}`);
        edgeSet.add(`${j},${i}`);
      }
    }
  }

  // 4. 24 Octahedral Cells
  const centroids: Array<[number, number, number, number]> = [];
  for (let d1 = 0; d1 < 4; d1++) {
    for (let d2 = d1 + 1; d2 < 4; d2++) {
      for (const s1 of [0.5, -0.5]) {
        for (const s2 of [0.5, -0.5]) {
          const c: [number, number, number, number] = [0, 0, 0, 0];
          c[d1] = s1;
          c[d2] = s2;
          centroids.push(c);
        }
      }
    }
  }

  const cells: PolytopeCell4D[] = centroids.map((c) => {
    const cellVertices: number[] = [];
    for (let vIdx = 0; vIdx < 24; vIdx++) {
      if (Math.abs(dist(vertices[vIdx], c) - Math.SQRT1_2) < 1e-4) {
        cellVertices.push(vIdx);
      }
    }

    const faces: Array<number[]> = [];
    for (let a = 0; a < cellVertices.length; a++) {
      for (let b = a + 1; b < cellVertices.length; b++) {
        for (let k = b + 1; k < cellVertices.length; k++) {
          const u = cellVertices[a], v = cellVertices[b], w = cellVertices[k];
          if (
            edgeSet.has(`${u},${v}`) &&
            edgeSet.has(`${v},${w}`) &&
            edgeSet.has(`${u},${w}`)
          ) {
            faces.push([u, v, w]);
          }
        }
      }
    }

    return {
      name: `24-Cell Octahedral Cell`,
      vertices: cellVertices,
      faces,
    };
  });

  return {
    name: '24-cell (icositetrachoron)',
    description: '24 vertices • 96 edges • 24 octahedral cells',
    vertices,
    edges,
    cells,
  };
}
