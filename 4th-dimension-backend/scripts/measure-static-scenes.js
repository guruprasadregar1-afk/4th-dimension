require('dotenv').config({ path: 'd:/4th dimension/4 dimension project code/4th-dimension-backend/.env' });
const mongoose = require('mongoose');

// 4D Rotation matrix helper
function rotatePoint4D(p, xw, yw, zw, timeAngle) {
  let [x, y, z, w] = p;
  const totalXW = xw + timeAngle;
  const totalYW = yw + timeAngle * 0.7;
  const totalZW = zw + timeAngle * 0.5;

  if (totalXW !== 0) {
    const cos = Math.cos(totalXW);
    const sin = Math.sin(totalXW);
    const nx = x * cos - w * sin;
    const nw = x * sin + w * cos;
    x = nx;
    w = nw;
  }
  if (totalYW !== 0) {
    const cos = Math.cos(totalYW);
    const sin = Math.sin(totalYW);
    const ny = y * cos - w * sin;
    const nw = y * sin + w * cos;
    y = ny;
    w = nw;
  }
  if (totalZW !== 0) {
    const cos = Math.cos(totalZW);
    const sin = Math.sin(totalZW);
    const nz = z * cos - w * sin;
    const nw = z * sin + w * cos;
    z = nz;
    w = nw;
  }
  return [x, y, z, w];
}

function rotatePoint3D(p, azimuth, elevation) {
  let [x, y, z] = p;
  const cosY = Math.cos(azimuth);
  const sinY = Math.sin(azimuth);
  const nx = x * cosY + z * sinY;
  const nz = -x * sinY + z * cosY;
  x = nx;
  z = nz;

  const cosX = Math.cos(elevation);
  const sinX = Math.sin(elevation);
  const ny = y * cosX - z * sinX;
  const nz2 = y * sinX + z * cosX;
  y = ny;
  z = nz2;
  return [x, y, z];
}

async function measureStaticScenes() {
  await mongoose.connect(process.env.MONGODB_URI);
  const Scene = mongoose.model(
    'Scene',
    new mongoose.Schema({ title: String, primitives: Array, metadata: Object }, { strict: false }),
  );

  const sceneTitles = [
    /Dr Johnson/i,
    /Truck/i,
    /Train/i,
  ];

  console.log('--- EMPIRICAL STATIC SCENE MEASUREMENT STEP ---');

  for (const titleRegex of sceneTitles) {
    const scene = await Scene.findOne({ title: titleRegex }).lean();
    if (!scene) {
      console.log(`Scene matching ${titleRegex} not found in DB!`);
      continue;
    }

    console.log(`\nMeasuring Scene: "${scene.title}" (${scene.primitives ? scene.primitives.length : 0} primitives)`);

    let prims = scene.primitives || [];
    if (prims.length === 0) {
      console.log('No primitives embedded directly in scene doc.');
      continue;
    }

    // Sample 8 bounding/corner vertices or sample primitive centers
    // Find min/max bounds in 3D
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    for (const p of prims) {
      const [x, y, z] = p.mean;
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
    }

    console.log(`  3D Bounds: X=[${minX.toFixed(2)}, ${maxX.toFixed(2)}], Y=[${minY.toFixed(2)}, ${maxY.toFixed(2)}], Z=[${minZ.toFixed(2)}, ${maxZ.toFixed(2)}]`);

    // Build 8 bounding box vertices with w = 0 (static 3D scene)
    const bboxVertices = [
      [minX, minY, minZ, 0],
      [maxX, minY, minZ, 0],
      [minX, maxY, minZ, 0],
      [maxX, maxY, minZ, 0],
      [minX, minY, maxZ, 0],
      [maxX, minY, maxZ, 0],
      [minX, maxY, maxZ, 0],
      [maxX, maxY, maxZ, 0],
    ];

    const bboxEdges = [
      [0,1], [2,3], [4,5], [6,7],
      [0,2], [1,3], [4,6], [5,7],
      [0,4], [1,5], [2,6], [3,7]
    ];

    // Measure rigid 3D distances (Ordinary 3D space)
    let min3D = Infinity, max3D = -Infinity;
    for (const [i, j] of bboxEdges) {
      const v1 = bboxVertices[i];
      const v2 = bboxVertices[j];
      const d = Math.hypot(v1[0] - v2[0], v1[1] - v2[1], v1[2] - v2[2]);
      min3D = Math.min(min3D, d);
      max3D = Math.max(max3D, d);
    }
    const ratio3D = max3D / min3D;
    console.log(`  3D Control Measurement: MinEdge=${min3D.toFixed(3)}, MaxEdge=${max3D.toFixed(3)}, StretchRatio=${ratio3D.toFixed(2)}x`);

    // Measure under 4D hyperplane rotation for w=0 static scene
    // Hyperplane angles test: xw=0.5, yw=0.3, zw=0.2
    const distanceW = 3.2;
    const projected3DPointsFrom4D = [];
    for (const v of bboxVertices) {
      const rot4 = rotatePoint4D(v, 0.5, 0.3, 0.2, 0);
      const wScale = distanceW / (distanceW - rot4[3] * 0.6);
      projected3DPointsFrom4D.push([rot4[0] * wScale, rot4[1] * wScale, rot4[2] * wScale]);
    }

    let min4D = Infinity, max4D = -Infinity;
    for (const [i, j] of bboxEdges) {
      const r1 = projected3DPointsFrom4D[i];
      const r2 = projected3DPointsFrom4D[j];
      const d = Math.hypot(r1[0] - r2[0], r1[1] - r2[1], r1[2] - r2[2]);
      min4D = Math.min(min4D, d);
      max4D = Math.max(max4D, d);
    }
    const ratio4D = max4D / min4D;
    console.log(`  4D Hyperplane Measurement (w=0): MinEdge=${min4D.toFixed(3)}, MaxEdge=${max4D.toFixed(3)}, StretchRatio=${ratio4D.toFixed(2)}x`);
  }

  await mongoose.disconnect();
}

measureStaticScenes().catch((err) => {
  console.error(err);
  process.exit(1);
});
