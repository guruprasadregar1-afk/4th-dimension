require('dotenv').config({ path: 'd:/4th dimension/4 dimension project code/4th-dimension-backend/.env' });
const mongoose = require('mongoose');

async function inspect() {
  await mongoose.connect(process.env.MONGODB_URI);
  const Scene = mongoose.model(
    'Scene',
    new mongoose.Schema(
      { title: String, primitives: Array },
      { strict: false },
    ),
  );

  const scenes = await Scene.find({
    title: { $in: [/Dr Johnson/i, /Truck/i, /Playroom/i] },
  });
  for (const s of scenes) {
    console.log('\n--- SCENE:', s.title, '---');
    if (!s.primitives || s.primitives.length === 0) {
      console.log('No primitives embedded (may be GridFS or empty)');
      continue;
    }
    console.log('Primitive count:', s.primitives.length);
    const p = s.primitives[0];
    console.log('Sample primitive 0:', {
      mean: p.mean,
      covLen: p.covariance ? p.covariance.length : 0,
      covDiag: p.covariance
        ? [p.covariance[0], p.covariance[5], p.covariance[10], p.covariance[15]]
        : [],
      covCross: p.covariance
        ? [p.covariance[3], p.covariance[7], p.covariance[11]]
        : [],
      alpha: p.alpha,
    });

    let maxSpatialVar = 0;
    let minSpatialVar = Infinity;
    let minTempVar = Infinity;
    let maxTempVar = 0;
    let hasNaN = false;

    for (const prim of s.primitives) {
      const c = prim.covariance || [];
      if (c.length === 16) {
        maxSpatialVar = Math.max(maxSpatialVar, c[0], c[5], c[10]);
        minSpatialVar = Math.min(minSpatialVar, c[0], c[5], c[10]);
        minTempVar = Math.min(minTempVar, c[15]);
        maxTempVar = Math.max(maxTempVar, c[15]);
        if (c.some((v) => Number.isNaN(v))) hasNaN = true;
      }
    }
    console.log('Stats:', {
      maxSpatialVar,
      minSpatialVar,
      minTempVar,
      maxTempVar,
      hasNaN,
    });
  }

  await mongoose.disconnect();
}
inspect().catch((e) => {
  console.error(e);
  process.exit(1);
});
