require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/4th-dimension';

async function assignToAll() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const User = mongoose.model('User', new mongoose.Schema({ email: String, role: String }));
  const Scene = mongoose.model('Scene', new mongoose.Schema({
    title: String,
    description: String,
    ownerId: mongoose.Schema.Types.ObjectId,
    tags: [String],
    metadata: Object,
    primitives: Array,
    storageType: String,
    primitiveCount: Number,
    storageSizeBytes: Number,
  }, { timestamps: true }));

  const users = await User.find().lean();
  console.log(`Found ${users.length} users in database.`);

  const templateScenes = await Scene.find({
    title: {
      $in: [
        'Tanks & Temples: Truck',
        'Tanks & Temples: Train',
        'Deep Blending: Playroom',
        'Deep Blending: Dr Johnson',
        'Rotating Tesseract (xw-plane)',
        'Static Reference Sphere',
      ],
    },
  }).lean();

  console.log(`Found ${templateScenes.length} template scenes to copy.`);

  for (const user of users) {
    console.log(`\nProcessing user: ${user.email} (${user._id})`);
    for (const tpl of templateScenes) {
      const exists = await Scene.findOne({ ownerId: user._id, title: tpl.title });
      if (exists) {
        console.log(`  - Scene "${tpl.title}" already exists for ${user.email}`);
      } else {
        const copyDoc = new Scene({
          title: tpl.title,
          description: tpl.description,
          ownerId: user._id,
          tags: tpl.tags,
          metadata: tpl.metadata,
          primitives: tpl.primitives,
          storageType: tpl.storageType,
          primitiveCount: tpl.primitiveCount,
          storageSizeBytes: tpl.storageSizeBytes,
        });
        await copyDoc.save();
        console.log(`  ✅ Copied "${tpl.title}" (${tpl.primitiveCount} primitives) to ${user.email}`);
      }
    }
  }

  console.log('\n🎉 Assignment complete! All users now have access to all seeded scenes.');
  await mongoose.disconnect();
}

assignToAll().catch(console.error);
