/**
 * Generates a minimal valid 3D Gaussian Splatting binary PLY for import tests.
 */
const path = require('path');
const { write3dgsPly } = require('./write-3dgs-ply');

const GAUSSIANS = [
  { x: 0, y: 0, z: 0, opacity: 2, scale: [-2.3, -2.3, -2.3], rot: [1, 0, 0, 0], color: [0.5, 0.1, 0.1] },
  { x: 1, y: 0.2, z: -0.5, opacity: 1.5, scale: [-2, -2.5, -2.1], rot: [0.92, 0.1, 0.2, 0.05], color: [0.1, 0.6, 0.2] },
  { x: -0.8, y: 0.5, z: 0.3, opacity: 0.5, scale: [-2.8, -2.2, -2.4], rot: [0.85, -0.2, 0.1, 0.3], color: [0.2, 0.2, 0.8] },
  { x: 0.3, y: -0.7, z: 0.9, opacity: 3, scale: [-1.9, -1.9, -1.9], rot: [0.7, 0.3, 0.3, 0.4], color: [0.8, 0.5, 0.1] },
  { x: -0.2, y: 0.1, z: -1.2, opacity: 1, scale: [-2.6, -2.6, -2.6], rot: [0.95, 0.05, -0.1, 0.15], color: [0.6, 0.6, 0.6] },
];

const outPath = path.join(__dirname, 'sample-3dgs.ply');
const count = write3dgsPly(GAUSSIANS, outPath);
console.log(`Wrote ${outPath} (${count} gaussians)`);
