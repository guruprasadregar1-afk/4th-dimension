require('dotenv').config();
const fs = require('fs');
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/4th-dimension';

const DATASETS = [
  {
    name: 'Tanks & Temples: Truck',
    path: 'D:\\4th dimension\\Data\\tandt\\truck\\sparse\\0\\points3D.bin',
    tags: ['colmap', 'tandt', 'truck', 'real-world', '3dgs'],
    description: 'Real-world COLMAP sparse point cloud reconstruction of the Truck dataset from Tanks and Temples.',
    maxPoints: 8000,
  },
  {
    name: 'Tanks & Temples: Train',
    path: 'D:\\4th dimension\\Data\\tandt\\train\\sparse\\0\\points3D.bin',
    tags: ['colmap', 'tandt', 'train', 'real-world', '3dgs'],
    description: 'Real-world COLMAP sparse point cloud reconstruction of the Train dataset from Tanks and Temples.',
    maxPoints: 8000,
  },
  {
    name: 'Deep Blending: Playroom',
    path: 'D:\\4th dimension\\Data\\db\\playroom\\sparse\\0\\points3D.bin',
    tags: ['colmap', 'deep-blending', 'playroom', 'indoor', '3dgs'],
    description: 'Indoor scene COLMAP sparse point cloud reconstruction of Playroom from Deep Blending.',
    maxPoints: 8000,
  },
  {
    name: 'Deep Blending: Dr Johnson',
    path: 'D:\\4th dimension\\Data\\db\\drjohnson\\sparse\\0\\points3D.bin',
    tags: ['colmap', 'deep-blending', 'drjohnson', 'indoor', '3dgs'],
    description: 'Indoor scene COLMAP sparse point cloud reconstruction of Dr Johnson from Deep Blending.',
    maxPoints: 8000,
  },
];

const GaussianPrimitiveSchema = new mongoose.Schema(
  {
    mean: { type: [Number], required: true },
    covariance: { type: [Number], required: true },
    color: { type: [Number], required: true },
    alpha: { type: Number, required: true },
  },
  { _id: false },
);

const SceneSchema = new mongoose.Schema(
  {
    title: String,
    description: String,
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    tags: [String],
    metadata: { type: Object, default: {} },
    primitives: [GaussianPrimitiveSchema],
    storageType: { type: String, enum: ['embedded', 'gridfs'], default: 'embedded' },
    gridFsFileId: { type: mongoose.Schema.Types.ObjectId, required: false },
    primitiveCount: { type: Number, default: 0 },
    storageSizeBytes: { type: Number, default: 0 },
  },
  { timestamps: true },
);

const UserSchema = new mongoose.Schema({
  email: String,
  hashedPassword: String,
  role: String,
});

const Scene = mongoose.model('Scene', SceneSchema);
const User = mongoose.model('User', UserSchema);

function parseColmapPoints3dBin(filePath, maxPoints = 8000) {
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return [];
  }

  const buffer = fs.readFileSync(filePath);
  let offset = 0;

  const numPoints = Number(buffer.readBigUInt64LE(offset));
  offset += 8;

  const stepStride = Math.max(1, Math.floor(numPoints / maxPoints));
  const rawPoints = [];

  for (let i = 0; i < numPoints && rawPoints.length < maxPoints; i++) {
    offset += 8;
    const x = buffer.readDoubleLE(offset);
    const y = buffer.readDoubleLE(offset + 8);
    const z = buffer.readDoubleLE(offset + 16);
    offset += 24;

    const r = buffer.readUInt8(offset);
    const g = buffer.readUInt8(offset + 1);
    const b = buffer.readUInt8(offset + 2);
    offset += 3;

    offset += 8;
    const trackLen = Number(buffer.readBigUInt64LE(offset));
    offset += 8;
    offset += trackLen * 8;

    if (i % stepStride === 0) {
      rawPoints.push({ x, y, z, r, g, b });
    }
  }

  if (rawPoints.length === 0) return [];

  // Calculate centroid and maximum bounding radius
  let sumX = 0, sumY = 0, sumZ = 0;
  for (const pt of rawPoints) {
    sumX += pt.x;
    sumY += pt.y;
    sumZ += pt.z;
  }
  const cx = sumX / rawPoints.length;
  const cy = sumY / rawPoints.length;
  const cz = sumZ / rawPoints.length;

  let maxDist = 0;
  for (const pt of rawPoints) {
    const dist = Math.hypot(pt.x - cx, pt.y - cy, pt.z - cz);
    maxDist = Math.max(maxDist, dist);
  }
  const targetRadius = 3.0;
  const scaleFactor = maxDist > 0 ? targetRadius / maxDist : 1.0;

  const primitives = rawPoints.map((pt) => {
    const nx = (pt.x - cx) * scaleFactor;
    const ny = (pt.y - cy) * scaleFactor;
    const nz = (pt.z - cz) * scaleFactor;
    return {
      mean: [Number(nx.toFixed(4)), Number(ny.toFixed(4)), Number(nz.toFixed(4)), 0.0],
      covariance: [
        0.02, 0, 0, 0,
        0, 0.02, 0, 0,
        0, 0, 0.02, 0,
        0, 0, 0, 0.05,
      ],
      color: [
        Number((pt.r / 255).toFixed(3)),
        Number((pt.g / 255).toFixed(3)),
        Number((pt.b / 255).toFixed(3)),
        1.0,
      ],
      alpha: 0.85,
    };
  });

  return primitives;
}

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const users = await User.find().lean();
  if (users.length === 0) {
    console.error('No users found in database.');
    process.exit(1);
  }

  for (const user of users) {
    console.log(`\n--- Seeding for User: ${user.email} (${user._id}) ---`);

    for (const ds of DATASETS) {
      const primitives = parseColmapPoints3dBin(ds.path, ds.maxPoints);
      if (primitives.length === 0) continue;

      await Scene.deleteMany({ ownerId: user._id, title: ds.name });

      const sceneDoc = new Scene({
        title: ds.name,
        description: ds.description,
        ownerId: user._id,
        tags: ds.tags,
        metadata: {
          duration: 0.0,
          isTimeVarying: false,
          timestepCount: 1,
          source: 'COLMAP points3D.bin',
          originalPointCount: primitives.length,
        },
        primitives,
        storageType: 'embedded',
        primitiveCount: primitives.length,
        storageSizeBytes: Buffer.byteLength(JSON.stringify({ primitives }), 'utf8'),
      });

      const saved = await sceneDoc.save();
      console.log(`✅ Seeded "${saved.title}" (${saved.primitiveCount} primitives) for ${user.email}`);
    }
  }

  console.log('\n🎉 Seeding complete for all users!');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
