require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/4th-dimension';

async function check() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const User = mongoose.model('User', new mongoose.Schema({ email: String, role: String }));
  const Scene = mongoose.model('Scene', new mongoose.Schema({ title: String, ownerId: mongoose.Schema.Types.ObjectId, primitiveCount: Number }));

  const users = await User.find().lean();
  console.log('\n--- USERS IN DATABASE ---');
  for (const u of users) {
    const sceneCount = await Scene.countDocuments({ ownerId: u._id });
    console.log(`User ID: ${u._id} | Email: ${u.email} | Scenes Owned: ${sceneCount}`);
  }

  const scenes = await Scene.find().select('title ownerId primitiveCount').lean();
  console.log('\n--- ALL SCENES IN DATABASE ---');
  for (const s of scenes) {
    const owner = users.find((u) => u._id.toString() === s.ownerId.toString());
    console.log(`Scene: "${s.title}" (${s.primitiveCount} primitives) | Owner: ${owner ? owner.email : s.ownerId}`);
  }

  await mongoose.disconnect();
}

check().catch(console.error);
