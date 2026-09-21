require('dotenv').config({ path: 'd:/4th dimension/4 dimension project code/4th-dimension-backend/.env' });
const mongoose = require('mongoose');

async function cleanup() {
  await mongoose.connect(process.env.MONGODB_URI);
  const Scene = mongoose.model(
    'Scene',
    new mongoose.Schema(
      { title: String, tags: [String], primitiveCount: Number },
      { strict: false },
    ),
  );

  const debrisQuery = {
    $or: [
      { title: { $regex: /^Load Scene/i } },
      { title: { $regex: /^Load Test Scene/i } },
      { title: 'Step 3 Test Scene' },
      { tags: 'loadtest' },
      { tags: 'load' },
    ],
  };

  const debris = await Scene.find(debrisQuery);
  console.log('Found debris count:', debris.length);
  for (const doc of debris) {
    console.log(
      'Deleting debris:',
      doc._id.toString(),
      '|',
      doc.title,
      '| primitives:',
      doc.primitiveCount,
    );
  }

  const result = await Scene.deleteMany(debrisQuery);
  console.log('Deleted count:', result.deletedCount);

  const remaining = await Scene.find({});
  console.log('Remaining clean scene count in DB:', remaining.length);
  for (const s of remaining) {
    console.log(
      '-',
      s._id.toString(),
      '|',
      s.title,
      '| primitives:',
      s.primitiveCount,
    );
  }

  await mongoose.disconnect();
}

cleanup().catch((e) => {
  console.error(e);
  process.exit(1);
});
