/**
 * Generates a colorful sphere of ~1200 3D Gaussians — no internet required.
 * Good for manual import demos when GitHub/HuggingFace downloads fail.
 */
const path = require('path');
const { write3dgsPly } = require('./write-3dgs-ply');

const COUNT = 1200;
const RADIUS = 1.2;
const golden = Math.PI * (3 - Math.sqrt(5));

const gaussians = [];

for (let i = 0; i < COUNT; i++) {
  const t = i / (COUNT - 1);
  const inclination = Math.acos(1 - 2 * t);
  const azimuth = golden * i;

  const x = RADIUS * Math.sin(inclination) * Math.cos(azimuth);
  const y = RADIUS * Math.sin(inclination) * Math.sin(azimuth);
  const z = RADIUS * Math.cos(inclination);

  const hue = (i / COUNT) * 6.28;
  const color = [
    0.5 + 0.5 * Math.cos(hue),
    0.5 + 0.5 * Math.cos(hue + 2.09),
    0.5 + 0.5 * Math.cos(hue + 4.18),
  ];

  gaussians.push({
    x,
    y,
    z,
    opacity: 2.5,
    scale: [-2.4, -2.4, -2.4],
    rot: [1, 0, 0, 0],
    color,
  });
}

const outPath = path.join(__dirname, 'demo-sphere-3dgs.ply');
const count = write3dgsPly(gaussians, outPath);
console.log(`Wrote ${outPath} (${count} gaussians, ~${(count * 68 / 1024).toFixed(0)} KB)`);
