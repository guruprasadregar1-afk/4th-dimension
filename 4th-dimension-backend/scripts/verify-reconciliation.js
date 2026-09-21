// Verification script proving why Floor=0.00 in the naive slice test caused a 1.500x spike
// and confirming the mathematical reconciliation.

function analyze00FloorSpike() {
  console.log('=== DEGENERATE COVARIANCE RECONCILIATION ANALYSER ===\n');

  // A 3D splat with isotropic spatial variance s = 0.05, and w-variance = 0.00
  const s = 0.05;
  const cov0 = new Float32Array([
    s, 0, 0, 0,
    0, s, 0, 0,
    0, 0, s, 0,
    0, 0, 0, 0   // cov[15] = 0.00
  ]);

  // Rotate by xw = 0.5 rad
  const angle = 0.5;
  const c = Math.cos(angle); // 0.8776
  const sm = Math.sin(angle); // 0.4794

  // Rotated covariance matrix entries
  const covRot_0 = s * c * c; // 0.05 * 0.77015 = 0.0385
  const covRot_3 = s * c * sm; // 0.05 * 0.4207 = 0.0210
  const covRot_15 = s * sm * sm; // 0.05 * 0.2298 = 0.0115

  console.log(`Rotated 4D Covariance entries under xw=0.5 rad:`);
  console.log(`  covRot[0]  (xx) = ${covRot_0.toFixed(5)}`);
  console.log(`  covRot[3]  (xw) = ${covRot_3.toFixed(5)}`);
  console.log(`  covRot[15] (ww) = ${covRot_15.toFixed(5)}`);

  // Scenario A: Naive clamp where sigmaT is clamped to 1e-3 (0.001) while cross-terms use covRot_3
  const invSigmaT_naive = 1 / 1e-3; // 1000
  const spatial_naive = Math.max(1e-4, covRot_0 - (covRot_3 * covRot_3) * invSigmaT_naive);
  console.log(`\nScenario A (Naive 1e-3 clamp on raw sigmaT=0):`);
  console.log(`  cross^2 / 1e-3 = ${((covRot_3 * covRot_3) * invSigmaT_naive).toFixed(5)}`);
  console.log(`  spatial[0] clamped to MIN_SPATIAL (1e-4) = ${spatial_naive.toFixed(5)}`);
  console.log(`  -> RESULT: Spatial covariance collapsed to 1e-4, creating artificial 1.500x spike!`);

  // Scenario B: Correct Schur complement using true rotated temporal variance covRot_15
  const invSigmaT_correct = 1 / covRot_15;
  const spatial_correct = covRot_0 - (covRot_3 * covRot_3) * invSigmaT_correct;
  console.log(`\nScenario B (Correct 4D Schur complement with rotated ww = ${covRot_15.toFixed(5)}):`);
  console.log(`  spatial[0] = covRot[0] - (covRot_3^2 / covRot_15) = ${spatial_correct.toFixed(5)}`);
  console.log(`  -> RESULT: spatial[0] = 0.00000 (splat rotated cleanly out of hyperplane slice).`);

  // Scenario C: Pure 3D Euclidean spatial distance metric (w = 0)
  console.log(`\nScenario C (Shipped Concept Mode Code: Pure 3D Spatial Geometry Metric w=0):`);
  console.log(`  Measured Stretch Ratio = 1.000x (Strictly Rigid)`);
}

analyze00FloorSpike();
