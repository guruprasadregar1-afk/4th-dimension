require('dotenv').config({ path: 'd:/4th dimension/4 dimension project code/4th-dimension-backend/.env' });
const mongoose = require('mongoose');

async function checkTesseract() {
  await mongoose.connect(process.env.MONGODB_URI);
  const Scene = mongoose.model('Scene', new mongoose.Schema({ title: String, metadata: Object, primitiveCount: Number, tags: [String] }, { strict: false }));

  const scenes = await Scene.find({ title: /Tesseract/i });
  console.log('Found Tesseract scenes count:', scenes.length);

  for (const s of scenes) {
    console.log('\n--- SCENE ID:', s._id.toString(), '| TITLE:', s.title, '---');
    console.log('primitiveCount:', s.primitiveCount);
    console.log('tags:', s.tags);
    console.log('metadata:', JSON.stringify(s.metadata, null, 2));
  }

  await mongoose.disconnect();
}

checkTesseract().catch(e => {
  console.error(e);
  process.exit(1);
});
