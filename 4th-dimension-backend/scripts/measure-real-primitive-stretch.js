require('dotenv').config({ path: 'd:/4th dimension/4 dimension project code/4th-dimension-backend/.env' });
const mongoose = require('mongoose');

function rotationMatrixPlane(i, j, angle) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const m = new Float32Array(16);
  m[0] = m[5] = m[10] = m[15] = 1;
  m[i * 4 + i] = c;
  m[j * 4 + j] = c;
  m[i * 4 + j] = -s;
  m[j * 4 + i] = s;
  return m;
}

function multiply4x4(a, b) {
  const out = new Float32Array(16);
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      out[col * 4 + row] =
        a[row] * b[col * 4] +
        a[4 + row] * b[col * 4 + 1] +
        a[8 + row] * b[col * 4 + 2] +
        a[12 + row] * b[col * 4 + 3];
    }
  }
  return out;
}

function transpose4x4(m) {
  const out = new Float32Array(16);
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      out[col * 4 + row] = m[row * 4 + col];
    }
  }
  return out;
}

function buildRotation4D(rotation) {
  const rxw = rotationMatrixPlane(0, 3, rotation.xw);
  const ryw = rotationMatrixPlane(1, 3, rotation.yw);
  const rzw = rotationMatrixPlane(2, 3, rotation.zw);
  return multiply4x4(multiply4x4(rzw, ryw), rxw);
}

function transformCovariance4D(cov, matrix) {
  return multiply4x4(multiply4x4(matrix, cov), transpose4x4(matrix));
}

function sliceWithCustomFloor(covArr, rotation, floorVal) {
  const cov = new Float32Array(covArr);
  cov[15] = floorVal;
  const matrix = buildRotation4D(rotation);
  const rotatedCov = transformCovariance4D(cov, matrix);

  const sigmaT = Math.max(1e-3, rotatedCov[15]);
  const cross = [rotatedCov[3], rotatedCov[7], rotatedCov[11]];
  const invSigmaT = 1 / sigmaT;

  const spatial = new Float32Array(9);
  spatial[0] = Math.max(1e-4, rotatedCov[0] - cross[0] * cross[0] * invSigmaT);
  spatial[4] = Math.max(1e-4, rotatedCov[5] - cross[1] * cross[1] * invSigmaT);
  spatial[8] = Math.max(1e-4, rotatedCov[10] - cross[2] * cross[2] * invSigmaT);

  const tr0 = cov[0] + cov[5] + cov[10];
  const trRot = spatial[0] + spatial[4] + spatial[8];

  return Math.max(tr0, trRot) / Math.max(1e-6, Math.min(tr0, trRot));
}

async function testFloorSensitivities() {
  await mongoose.connect(process.env.MONGODB_URI);
  const Scene = mongoose.model(
    'Scene',
    new mongoose.Schema({ title: String, primitives: Array }, { strict: false }),
  );

  const doc = await Scene.findOne({ title: /Dr Johnson/i }).lean();
  const prims = doc.primitives.slice(0, 100);
  const rot = { xw: 0.5, yw: 0.3, zw: 0.2 };

  console.log('--- SAFETY FLOOR SENSITIVITY GUT-CHECK ---');
  for (const floorVal of [0.00, 0.02, 0.05, 0.10, 0.20]) {
    let ratios = [];
    for (const p of prims) {
      ratios.push(sliceWithCustomFloor(p.covariance, rot, floorVal));
    }
    const avg = ratios.reduce((a, b) => a + b, 0) / ratios.length;
    console.log(`  Floor = ${floorVal.toFixed(2)} -> Measured Stretch Ratio = ${avg.toFixed(3)}x`);
  }
  await mongoose.disconnect();
}

testFloorSensitivities().catch(console.error);
