require('dotenv').config({ path: 'd:/4th dimension/4 dimension project code/4th-dimension-backend/.env' });
const mongoose = require('mongoose');

async function patchTesseract() {
  await mongoose.connect(process.env.MONGODB_URI);
  const Scene = mongoose.model(
    'Scene',
    new mongoose.Schema({ title: String, metadata: Object }, { strict: false }),
  );

  const tesseractScenes = await Scene.find({ title: /Tesseract/i });
  console.log('Found Tesseract scenes to patch:', tesseractScenes.length);

  for (const s of tesseractScenes) {
    s.metadata = {
      ...(s.metadata || {}),
      duration: 5.0,
      isTimeVarying: true,
      timestepCount: 12,
      layer: 'dynamic',
    };
    await Scene.updateOne(
      { _id: s._id },
      { $set: { metadata: s.metadata } },
    );
    console.log('✅ Patched Tesseract:', s._id.toString());
  }

  // Also patch Static Reference Sphere
  const sphereScenes = await Scene.find({ title: /Static Reference Sphere/i });
  for (const s of sphereScenes) {
    s.metadata = {
      ...(s.metadata || {}),
      duration: 0.0,
      isTimeVarying: false,
      timestepCount: 1,
      layer: 'static',
    };
    await Scene.updateOne(
      { _id: s._id },
      { $set: { metadata: s.metadata } },
    );
    console.log('✅ Patched Static Sphere:', s._id.toString());
  }

  // Verify all 4D scenes in DB after patch
  const allScenes = await Scene.find({}).lean();
  const timeVaryingCount = allScenes.filter(
    (sc) => sc.metadata?.isTimeVarying === true || (sc.metadata?.timestepCount ?? 0) > 1,
  ).length;

  console.log(`\n🎉 Patch complete! Total 4D scenes in DB: ${timeVaryingCount} out of ${allScenes.length}`);
  if (timeVaryingCount === 0) {
    throw new Error('SANITY CHECK FAILED: No 4D time-varying scenes exist in database after patch!');
  }

  await mongoose.disconnect();
}

patchTesseract().catch((e) => {
  console.error('Patch failed:', e);
  process.exit(1);
});
