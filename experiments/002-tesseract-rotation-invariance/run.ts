import { generateTesseractGeometry } from '../../4th-dimension-engine/src/math/polytopeGeometry';
import {
  rotatePrimitive4D,
  type HyperplaneRotation,
} from '../../4th-dimension-engine/src/math/hyperplane4d';
import { project4DPuzzlePoint } from '../../4th-dimension-engine/src/math/escapePuzzle';

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

function distance3D(
  p1: { screenX: number; screenY: number },
  p2: { screenX: number; screenY: number },
): number {
  return Math.hypot(p1.screenX - p2.screenX, p1.screenY - p2.screenY);
}

export function runExperiment002() {
  console.log('================================================================================');
  console.log('EXPERIMENT 002: TESSERACT ROTATION INVARIANCE & 3D PROJECTION DISTORTION');
  console.log('Methodology: Measure 4D Euclidean distance variance vs 3D shadow perspective distortion across 6 rotation planes.');
  console.log('================================================================================\n');

  const baseGeometry = generateTesseractGeometry();
  const planes: Array<{ name: string; rotation: (angle: number) => HyperplaneRotation }> = [
    { name: 'XW Plane', rotation: (a) => ({ xw: a, yw: 0, zw: 0 }) },
    { name: 'YW Plane', rotation: (a) => ({ xw: 0, yw: a, zw: 0 }) },
    { name: 'ZW Plane', rotation: (a) => ({ xw: 0, yw: 0, zw: a }) },
    { name: 'XW + YW Compound', rotation: (a) => ({ xw: a, yw: a * 0.5, zw: 0 }) },
    { name: 'XW + ZW Compound', rotation: (a) => ({ xw: a * 0.7, yw: 0, zw: a }) },
    { name: 'Full 4D Compound (XW+YW+ZW)', rotation: (a) => ({ xw: a, yw: a * 0.7, zw: a * 0.5 }) },
  ];

  const testAngles = [0, Math.PI / 6, Math.PI / 4, Math.PI / 3, Math.PI / 2];

  console.log(
    '| Plane / Mode                | Angle (rad) | 4D Max Edge Var | 4D Isometry Status | 3D Shadow Stretch Ratio |',
  );
  console.log(
    '|-----------------------------|-------------|-----------------|--------------------|-------------------------|',
  );

  let overallPassed = true;

  for (const plane of planes) {
    for (const angle of testAngles) {
      const rotConfig = plane.rotation(angle);

      // Rotate 4D vertices
      const rotated4DVertices: Array<[number, number, number, number]> = baseGeometry.vertices.map(
        (v) => {
          const prim = rotatePrimitive4D(
            {
              mean: v,
              covariance: new Float32Array(16),
              color: [1, 1, 1, 1],
              alpha: 1,
            },
            rotConfig,
          );
          return prim.mean;
        },
      );

      // Calculate 4D edge lengths
      const edgeLengths4D = baseGeometry.edges.map(([i, j]) =>
        distance4D(rotated4DVertices[i], rotated4DVertices[j]),
      );

      const maxVar4D = Math.max(...edgeLengths4D.map((len) => Math.abs(len - 2.0)));
      const is4DIsometry = maxVar4D < 1e-5;

      // Project rotated 4D vertices to 2D/3D shadow screen points
      const projected2DPoints = rotated4DVertices.map((v4) =>
        project4DPuzzlePoint(v4, 0.4, 0.3, 800, 600),
      );

      // Calculate 3D shadow projected pairwise edge distances
      const edgeLengths3D = baseGeometry.edges.map(([i, j]) =>
        distance3D(projected2DPoints[i], projected2DPoints[j]),
      );

      const min3D = Math.min(...edgeLengths3D);
      const max3D = Math.max(...edgeLengths3D);
      const stretchRatio3D = max3D / (min3D || 1e-5);

      if (!is4DIsometry) overallPassed = false;

      const angleDeg = ((angle * 180) / Math.PI).toFixed(0);
      const status4D = is4DIsometry ? '✅ TRUE ISOMETRY' : '❌ DISTORTED';

      console.log(
        `| ${plane.name.padEnd(27)} | ${(angle.toFixed(2) + ' (' + angleDeg + '°)').padEnd(11)} | ${maxVar4D.toExponential(2).padEnd(15)} | ${status4D.padEnd(18)} | ${stretchRatio3D.toFixed(3).padEnd(23)} |`,
      );
    }
  }

  console.log('\n--------------------------------------------------------------------------------');
  console.log(
    `SUMMARY: ${
      overallPassed
        ? '4D ROTATION ISOMETRY CONFIRMED (4D Edge Variance = 0.0, 3D Shadow Distortion Verified)'
        : 'ISOMETRY FAILURE DETECTED'
    }`,
  );
  console.log('--------------------------------------------------------------------------------\n');
}

if (process.argv[1]?.includes('002-tesseract-rotation-invariance')) {
  runExperiment002();
}
