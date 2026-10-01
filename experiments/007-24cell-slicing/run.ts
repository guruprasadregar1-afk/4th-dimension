import { generate24CellGeometry } from '../../4th-dimension-engine/src/math/polytopeGeometry';
import {
  slicePolytopeHyperplane,
  verifyMeshCongruence,
  type Hyperplane4D,
} from '../../4th-dimension-engine/src/math/hyperplaneSlicer';

export function runExperiment007() {
  console.log('================================================================================');
  console.log('EXPERIMENT 007: 24-CELL (ICOSITETRACHORON) EXACT HYPERPLANE SLICING');
  console.log('Methodology: Validate exact 3D cross-sections and structural invariants of the 24-cell.');
  console.log('================================================================================\n');

  const cell24 = generate24CellGeometry();

  console.log('--- PART 1: CENTRAL COORDINATE & OBLIQUE HYPERPLANE SLICES ---\n');
  console.log(
    '| Slice Description       | Plane Normal & Offset    | Vertices | Faces | Convexity | Coplanarity | Closure | Status  |',
  );
  console.log(
    '|-------------------------|--------------------------|----------|-------|-----------|-------------|---------|---------|',
  );

  const testCases: Array<{
    name: string;
    plane: Hyperplane4D;
    expectedMinV: number;
    description: string;
  }> = [
    {
      name: 'Central Coordinate (w=0)',
      plane: { normal: [0, 0, 0, 1], offset: 0.0 },
      expectedMinV: 14,
      description: 'Rhombic Dodecahedron slice (14 vertices, 12 quad/rhombic faces: 6 axis vertices + 8 edge midpoints)',
    },
    {
      name: 'Off-Center Coordinate (w=0.5)',
      plane: { normal: [0, 0, 0, 1], offset: 0.5 },
      expectedMinV: 6,
      description: 'Intermediate slice cutting cell boundaries',
    },
    {
      name: 'Central Oblique (x+y+z+w=0)',
      plane: { normal: [1, 1, 1, 1], offset: 0.0 },
      expectedMinV: 12,
      description: 'Symmetric oblique diagonal slice',
    },
    {
      name: 'Degenerate Out-of-Bounds (w=2.0)',
      plane: { normal: [0, 0, 0, 1], offset: 2.0 },
      expectedMinV: 0,
      description: 'Out-of-bounds slice returning empty mesh',
    },
  ];

  let allPassed = true;

  for (const tc of testCases) {
    const mesh = slicePolytopeHyperplane(cell24, tc.plane);

    const isConvex = mesh.vertexCount <= 1 ? true : mesh.isConvex;
    const isCoplanar = mesh.vertexCount <= 1 ? true : mesh.isCoplanarFaces;
    const isClosed = mesh.vertexCount <= 1 ? true : mesh.isClosed;
    const isValidV = tc.expectedMinV === 0 ? mesh.vertexCount === 0 : mesh.vertexCount >= tc.expectedMinV;

    const pass = isConvex && isCoplanar && isClosed && isValidV;
    if (!pass) allPassed = false;

    const normStr = `[${tc.plane.normal.join(',')}] offset=${tc.plane.offset}`;
    console.log(
      `| ${tc.name.padEnd(23)} | ${normStr.padEnd(24)} | ${String(mesh.vertexCount).padEnd(8)} | ${String(mesh.faceCount).padEnd(5)} | ${(isConvex ? '✅ YES' : '❌ NO').padEnd(9)} | ${(isCoplanar ? '✅ YES' : '❌ NO').padEnd(11)} | ${(isClosed ? '✅ YES' : '❌ NO').padEnd(7)} | ${pass ? '✅ PASS' : '❌ FAIL'} |`,
    );
  }

  console.log('\n--- PART 2: METRIC SYMMETRY & CONGRUENCE VALIDATION (w = +0.5 vs w = -0.5) ---\n');
  const meshPlus = slicePolytopeHyperplane(cell24, { normal: [0, 0, 0, 1], offset: 0.5 });
  const meshMinus = slicePolytopeHyperplane(cell24, { normal: [0, 0, 0, 1], offset: -0.5 });
  const isSymmetric = verifyMeshCongruence(meshPlus, meshMinus);

  console.log(`Metric Edge Length Congruence mesh(w=0.5) vs mesh(w=-0.5): ${isSymmetric ? '✅ 100% MATCH' : '❌ MISMATCH'}`);

  console.log('\n================================================================================');
  console.log(`STATUS: EXPERIMENT 007 ${allPassed && isSymmetric ? 'PASSED' : 'FAILED'}`);
  console.log('================================================================================\n');

  return allPassed && isSymmetric;
}

// Execute directly if run via npx tsx
if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes('007')) {
  runExperiment007();
}
