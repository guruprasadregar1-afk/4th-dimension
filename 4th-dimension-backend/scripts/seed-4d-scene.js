/**
 * Seed demo 4D scenes matching the implemented platform schema:
 *   GaussianPrimitive: { mean[4], covariance[16], color[4], alpha }
 *   Scene: { title, description, ownerId, tags, metadata, primitives, storageType, ... }
 *
 * Concept from master doc: rotating tesseract (4D hypercube) + static reference sphere.
 * Adapted to B5/B6 schema consumed by the 4D engine time-slicing pipeline.
 *
 * Usage:
 *   node scripts/seed-4d-scene.js
 *   (reads MONGODB_URI from .env in project root)
 */

require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://localhost:27017/4th-dimension';
const SEED_OWNER_EMAIL =
  process.env.SEED_OWNER_EMAIL || 'test@4dplatform.dev';

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

function cov4d(spatialVar = 0.05, temporalVar = 0.08) {
  return [
    spatialVar, 0, 0, 0,
    0, spatialVar, 0, 0,
    0, 0, spatialVar, 0,
    0, 0, 0, temporalVar,
  ];
}

function generateTesseractVertices() {
  const vertices = [];
  for (let i = 0; i < 16; i++) {
    vertices.push({
      x: i & 1 ? 1 : -1,
      y: i & 2 ? 1 : -1,
      z: i & 4 ? 1 : -1,
      w: i & 8 ? 1 : -1,
    });
  }
  return vertices;
}

function rotateXW(vertex, theta) {
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  return {
    x: vertex.x * cos - vertex.w * sin,
    y: vertex.y,
    z: vertex.z,
    w: vertex.x * sin + vertex.w * cos,
  };
}

/** Dynamic tesseract: 16 vertices × timesteps as 4D Gaussians (time = 4th dimension). */
function buildRotatingTesseractPrimitives(timesteps = 12, duration = 5) {
  const baseVertices = generateTesseractVertices();
  const primitives = [];

  for (let step = 0; step < timesteps; step++) {
    const theta = (step / timesteps) * Math.PI * 2;
    const t = (step / Math.max(timesteps - 1, 1)) * duration;

    for (const v of baseVertices) {
      const rotated = rotateXW(v, theta);
      primitives.push({
        mean: [rotated.x * 0.8, rotated.y * 0.8, rotated.z * 0.8, t],
        covariance: cov4d(0.04, 0.12),
        color: [0.2, 0.55, 0.95, 1],
        alpha: 0.88,
      });
    }
  }

  return primitives;
}

/** Static reference sphere as 4D Gaussians fixed at t=0 (tight temporal variance). */
function buildStaticSpherePrimitives(count = 40) {
  const primitives = [];
  const golden = Math.PI * (1 + Math.sqrt(5));

  for (let i = 0; i < count; i++) {
    const phi = Math.acos(2 * (i / count) - 1);
    const theta = golden * i;
    primitives.push({
      mean: [
        Math.cos(theta) * Math.sin(phi) * 1.2,
        Math.sin(theta) * Math.sin(phi) * 1.2,
        Math.cos(phi) * 1.2,
        0,
      ],
      covariance: cov4d(0.03, 0.005),
      color: [0.95, 0.45, 0.15, 1],
      alpha: 0.75,
    });
  }

  return primitives;
}

function payloadSizeBytes(primitives) {
  return Buffer.byteLength(JSON.stringify({ primitives }), 'utf8');
}

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const owner = await User.findOne({ email: SEED_OWNER_EMAIL.toLowerCase() });
  if (!owner) {
    throw new Error(
      `Owner user "${SEED_OWNER_EMAIL}" not found. Register first via POST /auth/register`,
    );
  }

  await Scene.deleteMany({ ownerId: owner._id, tags: 'seed-demo' });

  const tesseractPrimitives = buildRotatingTesseractPrimitives(12, 5);
  const spherePrimitives = buildStaticSpherePrimitives(40);

  const scenes = [
    {
      title: 'Rotating Tesseract (xw-plane)',
      description:
        '4D hypercube rotating through the x-w plane, stored as time-sliced 4D Gaussian primitives.',
      ownerId: owner._id,
      tags: ['seed-demo', 'tesseract', 'dynamic', '4d'],
      metadata: {
        duration: 5.0,
        isTimeVarying: true,
        timestepCount: 12,
        layer: 'dynamic',
      },
      primitives: tesseractPrimitives,
      storageType: 'embedded',
      primitiveCount: tesseractPrimitives.length,
      storageSizeBytes: payloadSizeBytes(tesseractPrimitives),
    },
    {
      title: 'Static Reference Sphere',
      description:
        'Static 3D Gaussian reference cloud at t=0 for baseline comparison rendering.',
      ownerId: owner._id,
      tags: ['seed-demo', 'sphere', 'static', '4d'],
      metadata: {
        duration: 0.0,
        isTimeVarying: false,
        timestepCount: 1,
        layer: 'static',
      },
      primitives: spherePrimitives,
      storageType: 'embedded',
      primitiveCount: spherePrimitives.length,
      storageSizeBytes: payloadSizeBytes(spherePrimitives),
    },
  ];

  const inserted = await Scene.insertMany(scenes);

  for (const scene of inserted) {
    console.log(
      `Inserted "${scene.title}" — ${scene.primitiveCount} primitives — id: ${scene._id}`,
    );
  }

  await mongoose.disconnect();
  console.log('Seeding complete.');
}

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
