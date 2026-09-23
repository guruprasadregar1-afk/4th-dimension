import type { PolytopeGeometry4D } from './polytopeGeometry';

export interface Hyperplane4D {
  /** Normal vector coefficients [a, b, c, d] */
  normal: [number, number, number, number];
  /** Hyperplane offset e (where a*x + b*y + c*z + d*w = e) */
  offset: number;
}

export type EdgeIntersectionType = 'INTERSECTION' | 'VERTEX' | 'ON_PLANE' | 'NONE';

export interface EdgeIntersectionResult {
  type: EdgeIntersectionType;
  point?: [number, number, number, number];
  point2?: [number, number, number, number]; // For ON_PLANE
  t?: number;
  edge: [number, number];
}

export interface CrossSectionMesh3D {
  vertices: Array<[number, number, number, number]>;
  vertices3D: Array<[number, number, number]>;
  faces: Array<number[]>;
  edges: Array<[number, number]>;
  vertexCount: number;
  faceCount: number;
  shapeName: string;
  isConvex: boolean;
  isClosed: boolean;
  isCoplanarFaces: boolean;
}

/** Signed distance from a 4D point to the hyperplane: a*x + b*y + c*z + d*w - offset */
export function signDistance4D(
  point: [number, number, number, number],
  plane: Hyperplane4D,
): number {
  const [a, b, c, d] = plane.normal;
  const [x, y, z, w] = point;
  return a * x + b * y + c * z + d * w - plane.offset;
}

/**
 * Sprint M2: Determines whether and where a hyperplane intersects a 4D edge.
 */
export function intersectEdgeHyperplane(
  p1: [number, number, number, number],
  p2: [number, number, number, number],
  plane: Hyperplane4D,
  edge: [number, number] = [0, 1],
  eps = 1e-7,
): EdgeIntersectionResult {
  const d1 = signDistance4D(p1, plane);
  const d2 = signDistance4D(p2, plane);

  const on1 = Math.abs(d1) <= eps;
  const on2 = Math.abs(d2) <= eps;

  if (on1 && on2) {
    return { type: 'ON_PLANE', point: p1, point2: p2, edge };
  }

  if (on1) {
    return { type: 'VERTEX', point: p1, t: 0, edge };
  }

  if (on2) {
    return { type: 'VERTEX', point: p2, t: 1, edge };
  }

  if (d1 * d2 > 0) {
    return { type: 'NONE', edge };
  }

  const t = -d1 / (d2 - d1);
  const point: [number, number, number, number] = [
    p1[0] + t * (p2[0] - p1[0]),
    p1[1] + t * (p2[1] - p1[1]),
    p1[2] + t * (p2[2] - p1[2]),
    p1[3] + t * (p2[3] - p1[3]),
  ];

  return { type: 'INTERSECTION', point, t, edge };
}

/**
 * Sprint M3: Slices a 4D polytope with a 3D hyperplane to produce an exact 3D cross-sectional mesh.
 */
export function slicePolytopeHyperplane(
  polytope: PolytopeGeometry4D,
  plane: Hyperplane4D,
  eps = 1e-5,
): CrossSectionMesh3D {
  const rawIntersections: Array<[number, number, number, number]> = [];

  // Helper to add unique vertex
  function addUniqueVertex(pt: [number, number, number, number]): number {
    for (let i = 0; i < rawIntersections.length; i++) {
      const v = rawIntersections[i];
      const dist = Math.hypot(v[0] - pt[0], v[1] - pt[1], v[2] - pt[2], v[3] - pt[3]);
      if (dist < eps) return i;
    }
    rawIntersections.push(pt);
    return rawIntersections.length - 1;
  }

  const cellFaces: Array<number[]> = [];

  // Process each 3D cell
  for (const cell of polytope.cells) {
    const cellPointIndices: number[] = [];

    // Check all edge pairs of cell faces
    for (const face of cell.faces) {
      for (let k = 0; k < face.length; k++) {
        const v1Idx = face[k];
        const v2Idx = face[(k + 1) % face.length];
        const p1 = polytope.vertices[v1Idx];
        const p2 = polytope.vertices[v2Idx];

        const res = intersectEdgeHyperplane(p1, p2, plane, [v1Idx, v2Idx]);
        if (res.point) {
          const idx = addUniqueVertex(res.point);
          if (!cellPointIndices.includes(idx)) {
            cellPointIndices.push(idx);
          }
        }
        if (res.point2) {
          const idx = addUniqueVertex(res.point2);
          if (!cellPointIndices.includes(idx)) {
            cellPointIndices.push(idx);
          }
        }
      }
    }

    if (cellPointIndices.length >= 3) {
      // Order cell intersection points into a convex planar face around their 3D centroid
      const facePoints = cellPointIndices.map((idx) => rawIntersections[idx]);
      const orderedLocalIndices = sortConvexPolygonVertices(facePoints);
      const orderedGlobalIndices = orderedLocalIndices.map((locIdx) => cellPointIndices[locIdx]);

      // Add face if valid
      if (orderedGlobalIndices.length >= 3) {
        cellFaces.push(orderedGlobalIndices);
      }
    }
  }

  // Deduplicate identical faces
  const uniqueFaces: Array<number[]> = [];
  for (const face of cellFaces) {
    const sorted = [...face].sort((a, b) => a - b).join(',');
    const exists = uniqueFaces.some(
      (f) => [...f].sort((a, b) => a - b).join(',') === sorted,
    );
    if (!exists) {
      uniqueFaces.push(face);
    }
  }

  // Extract mesh edges
  const edgeMap = new Map<string, [number, number]>();
  const edgeCountMap = new Map<string, number>();

  for (const face of uniqueFaces) {
    for (let i = 0; i < face.length; i++) {
      const u = face[i];
      const v = face[(i + 1) % face.length];
      const key = u < v ? `${u}-${v}` : `${v}-${u}`;
      edgeMap.set(key, u < v ? [u, v] : [v, u]);
      edgeCountMap.set(key, (edgeCountMap.get(key) || 0) + 1);
    }
  }

  const meshEdges = Array.from(edgeMap.values());

  // Verify Watertight Closure (every interior edge is shared by exactly 2 faces)
  let isClosed = uniqueFaces.length > 0;
  for (const count of edgeCountMap.values()) {
    if (count !== 2) {
      // Boundary/extreme degeneracy allows 1-edge counts at bounds
      if (uniqueFaces.length > 3) isClosed = false;
    }
  }

  // Convert 4D vertices to 3D projected vertices for mesh rendering & inspection
  const vertices3D: Array<[number, number, number]> = rawIntersections.map((v4) => [
    v4[0],
    v4[1],
    v4[2],
  ]);

  const vertexCount = rawIntersections.length;
  const faceCount = uniqueFaces.length;

  const isConvex = verifyMeshConvexity(rawIntersections, uniqueFaces);
  const isCoplanarFaces = verifyFaceCoplanarity(rawIntersections, uniqueFaces);
  const shapeName = classifyCrossSectionShape(vertexCount, faceCount);

  return {
    vertices: rawIntersections,
    vertices3D,
    faces: uniqueFaces,
    edges: meshEdges,
    vertexCount,
    faceCount,
    shapeName,
    isConvex,
    isClosed,
    isCoplanarFaces,
  };
}

/** Sort 2D/3D coplanar polygon vertices in cyclic counter-clockwise order around centroid */
function sortConvexPolygonVertices(
  pts: Array<[number, number, number, number]>,
): number[] {
  if (pts.length <= 3) return pts.map((_, i) => i);

  // Compute centroid
  const center: [number, number, number, number] = [0, 0, 0, 0];
  for (const p of pts) {
    center[0] += p[0] / pts.length;
    center[1] += p[1] / pts.length;
    center[2] += p[2] / pts.length;
    center[3] += p[3] / pts.length;
  }

  // Find two principal orthonormal axes in the planar span
  const v0: [number, number, number, number] = [
    pts[0][0] - center[0],
    pts[0][1] - center[1],
    pts[0][2] - center[2],
    pts[0][3] - center[3],
  ];
  const len0 = Math.hypot(...v0) || 1;
  const u0 = v0.map((c) => c / len0) as [number, number, number, number];

  let u1: [number, number, number, number] = [0, 0, 0, 0];
  for (let i = 1; i < pts.length; i++) {
    const candidate = [
      pts[i][0] - center[0],
      pts[i][1] - center[1],
      pts[i][2] - center[2],
      pts[i][3] - center[3],
    ];
    const dot = candidate.reduce((sum, c, k) => sum + c * u0[k], 0);
    const proj = candidate.map((c, k) => c - dot * u0[k]);
    const len1 = Math.hypot(...proj);
    if (len1 > 1e-4) {
      u1 = proj.map((c) => c / len1) as [number, number, number, number];
      break;
    }
  }

  // Compute angle theta for each point in local (u0, u1) basis
  const indexed = pts.map((p, i) => {
    const vec = [p[0] - center[0], p[1] - center[1], p[2] - center[2], p[3] - center[3]];
    const x = vec.reduce((sum, c, k) => sum + c * u0[k], 0);
    const y = vec.reduce((sum, c, k) => sum + c * u1[k], 0);
    const angle = Math.atan2(y, x);
    return { i, angle };
  });

  indexed.sort((a, b) => a.angle - b.angle);
  return indexed.map((item) => item.i);
}

export function verifyMeshConvexity(
  pts: Array<[number, number, number, number]>,
  faces: Array<number[]>,
  eps = 1e-5,
): boolean {
  if (pts.length <= 4) return true;

  // Convert 4D points to 3D projected coordinates for 3D half-space test
  const pts3D: Array<[number, number, number]> = pts.map((p) => [p[0], p[1], p[2]]);

  for (const face of faces) {
    if (face.length < 3) continue;

    const p0 = pts3D[face[0]];
    let n: [number, number, number] | null = null;

    // Find 2 non-collinear edge vectors in the face
    for (let i = 1; i < face.length - 1; i++) {
      const p1 = pts3D[face[i]];
      const p2 = pts3D[face[i + 1]];

      const v1 = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
      const v2 = [p2[0] - p0[0], p2[1] - p0[1], p2[2] - p0[2]];

      const cross: [number, number, number] = [
        v1[1] * v2[2] - v1[2] * v2[1],
        v1[2] * v2[0] - v1[0] * v2[2],
        v1[0] * v2[1] - v1[1] * v2[0],
      ];

      const len = Math.hypot(...cross);
      if (len > 1e-7) {
        n = [cross[0] / len, cross[1] / len, cross[2] / len];
        break;
      }
    }

    if (!n) continue;

    const d = n[0] * p0[0] + n[1] * p0[1] + n[2] * p0[2];
    let minDist = Infinity;
    let maxDist = -Infinity;

    for (const q of pts3D) {
      const dist = n[0] * q[0] + n[1] * q[1] + n[2] * q[2] - d;
      if (dist < minDist) minDist = dist;
      if (dist > maxDist) maxDist = dist;
    }

    // A convex polyhedron face plane cannot have vertices strictly on BOTH sides
    if (minDist < -eps && maxDist > eps) {
      return false;
    }
  }

  return true;
}

export function verifyFaceCoplanarity(
  pts: Array<[number, number, number, number]>,
  faces: Array<number[]>,
  eps = 1e-6,
): boolean {
  for (const face of faces) {
    if (face.length <= 3) continue;

    const p0 = pts[face[0]];
    const v1 = [
      pts[face[1]][0] - p0[0],
      pts[face[1]][1] - p0[1],
      pts[face[1]][2] - p0[2],
      pts[face[1]][3] - p0[3],
    ];
    const len1 = Math.hypot(...v1);
    if (len1 < 1e-9) continue;
    const u1 = v1.map((c) => c / len1);

    let u2: number[] | null = null;
    for (let k = 2; k < face.length; k++) {
      const candidate = [
        pts[face[k]][0] - p0[0],
        pts[face[k]][1] - p0[1],
        pts[face[k]][2] - p0[2],
        pts[face[k]][3] - p0[3],
      ];
      const dot = candidate.reduce((sum, c, i) => sum + c * u1[i], 0);
      const proj = candidate.map((c, i) => c - dot * u1[i]);
      const len2 = Math.hypot(...proj);
      if (len2 > 1e-8) {
        u2 = proj.map((c) => c / len2);
        break;
      }
    }

    if (!u2) continue;

    for (let k = 3; k < face.length; k++) {
      const vec = [
        pts[face[k]][0] - p0[0],
        pts[face[k]][1] - p0[1],
        pts[face[k]][2] - p0[2],
        pts[face[k]][3] - p0[3],
      ];
      const dot1 = vec.reduce((sum, c, i) => sum + c * u1[i], 0);
      const dot2 = vec.reduce((sum, c, i) => sum + c * u2![i], 0);
      const distSq = vec.reduce(
        (sum, c, i) => sum + (c - dot1 * u1[i] - dot2 * u2![i]) ** 2,
        0,
      );
      if (Math.sqrt(distSq) > eps) {
        return false;
      }
    }
  }

  return true;
}

export function verifyMeshCongruence(
  mesh1: CrossSectionMesh3D,
  mesh2: CrossSectionMesh3D,
  eps = 1e-5,
): boolean {
  if (mesh1.vertexCount !== mesh2.vertexCount) return false;
  if (mesh1.edges.length !== mesh2.edges.length) return false;
  if (mesh1.faces.length !== mesh2.faces.length) return false;

  const lengths1 = mesh1.edges
    .map(([u, v]) => {
      const p1 = mesh1.vertices[u];
      const p2 = mesh1.vertices[v];
      return Math.hypot(p1[0] - p2[0], p1[1] - p2[1], p1[2] - p2[2], p1[3] - p2[3]);
    })
    .sort((a, b) => a - b);

  const lengths2 = mesh2.edges
    .map(([u, v]) => {
      const p1 = mesh2.vertices[u];
      const p2 = mesh2.vertices[v];
      return Math.hypot(p1[0] - p2[0], p1[1] - p2[1], p1[2] - p2[2], p1[3] - p2[3]);
    })
    .sort((a, b) => a - b);

  for (let i = 0; i < lengths1.length; i++) {
    if (Math.abs(lengths1[i] - lengths2[i]) > eps) {
      return false;
    }
  }

  return true;
}

export function classifyCrossSectionShape(vCount: number, fCount: number): string {
  if (vCount === 0) return 'Empty (No Intersection)';
  if (vCount === 1) return 'Single Point (Vertex Contact)';
  if (vCount === 2) return 'Line Segment (Edge Contact)';
  if (vCount === 3) return 'Triangle';
  if (vCount === 4 && fCount === 4) return 'Tetrahedron';
  if (vCount === 4 && fCount === 5) return 'Square Pyramid';
  if (vCount === 5) return 'Square Pyramid / Triangular Prism';
  if (vCount === 6 && fCount === 8) return 'Octahedron';
  if (vCount === 6 && fCount === 5) return 'Triangular Prism';
  if (vCount === 8 && fCount === 6) return 'Cube';
  if (vCount === 12 && fCount === 14) return 'Cuboctahedron / Truncated Tetrahedron';
  if (vCount === 12) return 'Truncated Tetrahedron / Hexagonal Prism';

  return `3D Solid Polyhedron (${vCount} Vertices, ${fCount} Faces)`;
}
