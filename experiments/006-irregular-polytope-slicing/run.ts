import { generateAsymmetricSimplex5Geometry } from '../../4th-dimension-engine/src/math/polytopeGeometry';
import {
  computeCanonicalHyperplaneBasis,
  slicePolytopeHyperplane,
  type Hyperplane4D,
} from '../../4th-dimension-engine/src/math/hyperplaneSlicer';

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

export function runExperiment006() {
  console.log('================================================================================');
  console.log('EXPERIMENT 006: EXACT HYPERPLANE SLICING OF IRREGULAR 4D GEOMETRY');
  console.log('Methodology: Validate exact boundary slicing on asymmetric 4-simplex across coordinate & oblique hyperplanes.');
  console.log('================================================================================\n');

  const simplex = generateAsymmetricSimplex5Geometry();

  console.log('--- PART 1: ASYMMETRIC 4-SIMPLEX GEOMETRY SUMMARY ---');
  console.log(`- Geometry Name: ${simplex.name}`);
  console.log(`- Vertices (5): v0=(0,0,0,0), v1=(2,0,0,0), v2=(0,3,0,0), v3=(0,0,4,0), v4=(1,1,1,5)`);
  console.log(`- Edge Count: ${simplex.edges.length} (all pairs connected)`);
  console.log(`- Cell Count: ${simplex.cells.length} tetrahedral boundary cells\n`);

  let allPassed = true;

  // CASE 1: Axis-Aligned Hyperplane H1: w = 2.5
  console.log('--- PART 2: CASE 1 AXIS-ALIGNED HYPERPLANE H1 (w = 2.5) ---');
  const plane1: Hyperplane4D = { normal: [0, 0, 0, 1], offset: 2.5 };
  const mesh1 = slicePolytopeHyperplane(simplex, plane1);
  const vol1 = computeTetrahedronVolume3D(mesh1.vertices3D);

  const expVol1 = 0.500000;
  const pass1 =
    mesh1.vertexCount === 4 &&
    mesh1.faceCount === 4 &&
    mesh1.isConvex &&
    mesh1.isClosed &&
    Math.abs(vol1 - expVol1) < 1e-5;

  if (!pass1) allPassed = false;

  console.log(`- Slice Vertices (Act/Exp): ${mesh1.vertexCount} / 4`);
  console.log(`- Face Count: ${mesh1.faceCount}`);
  console.log(`- Shape Classification: ${mesh1.shapeName}`);
  console.log(`- Calculated 3D Volume: ${vol1.toFixed(6)} (Expected: ${expVol1.toFixed(6)})`);
  console.log(`- Convexity & Closure: ${(mesh1.isConvex && mesh1.isClosed ? '✅ YES' : '❌ NO')}`);
  console.log(`- Case 1 Validation Status: ${pass1 ? '✅ PASS' : '❌ FAIL'}\n`);

  // CASE 2: Oblique Hyperplane H2: x + y + z + w = 2.0
  console.log('--- PART 3: CASE 2 OBLIQUE HYPERPLANE H2 (x + y + z + w = 2.0) ---');
  const plane2: Hyperplane4D = { normal: [1, 1, 1, 1], offset: 2.0 };
  const mesh2 = slicePolytopeHyperplane(simplex, plane2);
  const vol2 = computeTetrahedronVolume3D(mesh2.vertices3D);
  const expVol2 = 5 / 3;

  // Verify distance preservation in 3D isometric chart
  let distPreserved = true;
  for (let i = 0; i < mesh2.vertices.length; i++) {
    for (let j = i + 1; j < mesh2.vertices.length; j++) {
      const p3_1 = mesh2.vertices3D[i];
      const p3_2 = mesh2.vertices3D[j];
      const d3 = Math.hypot(p3_1[0] - p3_2[0], p3_1[1] - p3_2[1], p3_1[2] - p3_2[2]);

      const p4_1 = mesh2.vertices[i];
      const p4_2 = mesh2.vertices[j];
      const d4 = Math.hypot(p4_1[0] - p4_2[0], p4_1[1] - p4_2[1], p4_1[2] - p4_2[2], p4_1[3] - p4_2[3]);

      if (Math.abs(d3 - d4) > 1e-5) distPreserved = false;
    }
  }

  const pass2 =
    mesh2.vertexCount === 4 &&
    mesh2.faceCount === 4 &&
    mesh2.isConvex &&
    mesh2.isClosed &&
    distPreserved &&
    Math.abs(vol2 - expVol2) < 1e-5;

  if (!pass2) allPassed = false;

  console.log(`- Slice Vertices (Act/Exp): ${mesh2.vertexCount} / 4`);
  console.log(`- Face Count: ${mesh2.faceCount}`);
  console.log(`- Shape Classification: ${mesh2.shapeName}`);
  console.log(`- Calculated 3D Volume: ${vol2.toFixed(6)} (Expected: ${expVol2.toFixed(6)})`);
  console.log(`- Isometric Distance Preservation: ${distPreserved ? '✅ YES' : '❌ NO'}`);
  console.log(`- Convexity & Closure: ${(mesh2.isConvex && mesh2.isClosed ? '✅ YES' : '❌ NO')}`);
  console.log(`- Case 2 Validation Status: ${pass2 ? '✅ PASS' : '❌ FAIL'}\n`);

  // PART 4: Boundary Degeneracy & Basis Vector Continuity
  console.log('--- PART 4: BOUNDARY DEGENERACY & FRAME CONTINUITY AUDITS ---');

  // Out of bounds
  const planeOOB: Hyperplane4D = { normal: [0, 0, 0, 1], offset: 6.0 };
  const meshOOB = slicePolytopeHyperplane(simplex, planeOOB);
  const passOOB = meshOOB.vertexCount === 0;

  // Basis Continuity
  let maxBasisDiff = 0;
  const steps = 50;
  let prevBasis: any = null;
  for (let k = 0; k <= steps; k++) {
    const t = (k / steps) * Math.PI;
    const planeSweep: Hyperplane4D = { normal: [Math.cos(t), Math.sin(t), 0.5, 0.5], offset: 1.0 };
    const b = computeCanonicalHyperplaneBasis(planeSweep);
    if (prevBasis) {
      for (let m = 0; m < 3; m++) {
        const diff = Math.hypot(
          b[m][0] - prevBasis[m][0],
          b[m][1] - prevBasis[m][1],
          b[m][2] - prevBasis[m][2],
          b[m][3] - prevBasis[m][3],
        );
        if (diff > maxBasisDiff) maxBasisDiff = diff;
      }
    }
    prevBasis = b;
  }

  const passContinuity = maxBasisDiff < 0.1;
  const passPart4 = passOOB && passContinuity;
  if (!passPart4) allPassed = false;

  console.log(`- Out-of-Bounds (w=6.0) Empty Mesh Verification: ${passOOB ? '✅ PASS (0 vertices)' : '❌ FAIL'}`);
  console.log(`- 50-Step Hyperplane Sweep Max Basis Delta: ${maxBasisDiff.toFixed(5)} (Threshold: < 0.1)`);
  console.log(`- Frame Continuity Audit: ${passContinuity ? '✅ PASS (Zero frame jumps)' : '❌ FAIL'}\n`);

  console.log('--------------------------------------------------------------------------------');
  console.log(
    `SUMMARY: ${
      allPassed
        ? 'EXPERIMENT 006 PASSED (100% Analytical Ground Truth Match for Irregular 4-Simplex Slicing)'
        : 'EXPERIMENT 006 FAILED'
    }`,
  );
  console.log('--------------------------------------------------------------------------------\n');
}

if (process.argv[1]?.includes('006-irregular-polytope-slicing')) {
  runExperiment006();
}
