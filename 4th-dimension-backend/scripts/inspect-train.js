require('dotenv').config({ path: 'd:/4th dimension/4 dimension project code/4th-dimension-backend/.env' });
const mongoose = require('mongoose');

async function inspectTrain() {
  await mongoose.connect(process.env.MONGODB_URI);
  const Scene = mongoose.model(
    'Scene',
    new mongoose.Schema(
      { title: String, primitives: Array },
      { strict: false },
    ),
  );

  const trainScenes = await Scene.find({ title: /Train/i });
  console.log('Found Train scenes in DB:', trainScenes.length);

  for (const scene of trainScenes) {
    console.log('\n--- SCENE:', scene._id.toString(), '|', scene.title, '---');
    if (!scene.primitives || scene.primitives.length === 0) {
      console.log('No primitives in scene');
      continue;
    }
    console.log('Primitive count:', scene.primitives.length);

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    for (const p of scene.primitives) {
      if (p.mean && p.mean.length >= 3) {
        minX = Math.min(minX, p.mean[0]);
        maxX = Math.max(maxX, p.mean[0]);
        minY = Math.min(minY, p.mean[1]);
        maxY = Math.max(maxY, p.mean[1]);
        minZ = Math.min(minZ, p.mean[2]);
        maxZ = Math.max(maxZ, p.mean[2]);
      }
    }

    console.log('Bounding Box X:', [minX, maxX], 'span:', maxX - minX);
    console.log('Bounding Box Y:', [minY, maxY], 'span:', maxY - minY);
    console.log('Bounding Box Z:', [minZ, maxZ], 'span:', maxZ - minZ);

    const sample = scene.primitives[0];
    console.log('Sample primitive 0:', {
      mean: sample.mean,
      cov: sample.covariance,
      alpha: sample.alpha,
      color: sample.color,
    });
  }

  await mongoose.disconnect();
}

inspectTrain().catch((e) => {
  console.error(e);
  process.exit(1);
});
