import {
  generateTesseractGeometry,
  generateSimplex5Geometry,
  generateOrthoplex16Geometry,
} from '../../4th-dimension-engine/src/math/polytopeGeometry';

function distance4D(
  p1: [number, number, number, number],
  p2: [number, number, number, number],
): number {
  return Math.sqrt(
    Math.pow(p1[0] - p2[0], 2) +
      Math.pow(p1[1] - p2[1], 2) +
      Math.pow(p1[2] - p2[2], 2) +
      Math.pow(p1[3] - p2[3], 2),
  );
}

interface ValidationResult {
  name: string;
  measuredVertices: number;
  expectedVertices: number;
  measuredEdges: number;
  expectedEdges: number;
  measuredEdgeLength: number;
  expectedEdgeLength: number;
  lengthUniformityStdDev: number;
  passed: boolean;
}

function validatePolytope(
  geometry: ReturnType<typeof generateTesseractGeometry>,
  expectedVertices: number,
  expectedEdges: number,
  expectedEdgeLength: number,
): ValidationResult {
  const { name, vertices, edges } = geometry;
  const measuredVertices = vertices.length;
  const measuredEdges = edges.length;

  const edgeLengths = edges.map(([i, j]) => distance4D(vertices[i], vertices[j]));
  const avgLength =
    edgeLengths.reduce((sum, len) => sum + len, 0) / (edgeLengths.length || 1);

  const variance =
    edgeLengths.reduce((sum, len) => sum + Math.pow(len - avgLength, 2), 0) /
    (edgeLengths.length || 1);
  const lengthUniformityStdDev = Math.sqrt(variance);

  const passed =
    measuredVertices === expectedVertices &&
    measuredEdges === expectedEdges &&
    Math.abs(avgLength - expectedEdgeLength) < 1e-4 &&
    lengthUniformityStdDev < 1e-4;

  return {
    name,
    measuredVertices,
    expectedVertices,
    measuredEdges,
    expectedEdges,
    measuredEdgeLength: avgLength,
    expectedEdgeLength,
    lengthUniformityStdDev,
    passed,
  };
}

export function runExperiment001() {
  console.log('================================================================================');
  console.log('EXPERIMENT 001: POLYTOPE GEOMETRY VALIDATION');
  console.log('Methodology: Verify 4D polytope topological & metric integrity against analytical values.');
  console.log('================================================================================\n');

  const results: ValidationResult[] = [
    validatePolytope(generateTesseractGeometry(), 16, 32, 2.0),
    validatePolytope(generateSimplex5Geometry(), 5, 10, Math.sqrt(8)),
    validatePolytope(generateOrthoplex16Geometry(), 8, 24, Math.sqrt(2)),
  ];

  console.log(
    '| Polytope Name           | Vertices (Exp/Act) | Edges (Exp/Act) | Edge Len (Exp/Act)   | StdDev (Len) | Status |',
  );
  console.log(
    '|-------------------------|--------------------|-----------------|----------------------|--------------|--------|',
  );

  let totalPassed = true;
  for (const r of results) {
    if (!r.passed) totalPassed = false;
    const vStr = `${r.expectedVertices} / ${r.measuredVertices}`;
    const eStr = `${r.expectedEdges} / ${r.measuredEdges}`;
    const lenStr = `${r.expectedEdgeLength.toFixed(4)} / ${r.measuredEdgeLength.toFixed(4)}`;
    const stdDevStr = r.lengthUniformityStdDev.toExponential(2);
    const statusStr = r.passed ? '✅ PASS' : '❌ FAIL';

    console.log(
      `| ${r.name.padEnd(23)} | ${vStr.padEnd(18)} | ${eStr.padEnd(15)} | ${lenStr.padEnd(20)} | ${stdDevStr.padEnd(12)} | ${statusStr} |`,
    );
  }

  console.log('\n--------------------------------------------------------------------------------');
  console.log(`SUMMARY: ${totalPassed ? 'ALL POLYTOPE GEOMETRY TESTS PASSED (100% Valid)' : 'SOME TESTS FAILED'}`);
  console.log('--------------------------------------------------------------------------------\n');
}

if (process.argv[1]?.includes('001-polytope-geometry-validation')) {
  runExperiment001();
}
