/**
 * Downloads publicly hosted 3D Gaussian Splatting sample files for manual import testing.
 * Falls back to offline generation when DNS/network blocks GitHub CDN hosts.
 *
 * Usage: node scripts/download-sample-3dgs.js
 */
const fs = require('fs');
const https = require('https');
const path = require('path');

const OUT_DIR = path.join(__dirname, '..', 'test', 'fixtures');

const SAMPLES = [
  {
    name: 'goksu-3dgs.ply',
    note: '~63 MB real-world 3DGS PLY (jsDelivr CDN rejects files > 20 MB — use GitHub raw only)',
    urls: [
      'https://raw.githubusercontent.com/candemiroguzhan/gaussian-splats-web-viewer/master/public/goksu.ply',
    ],
    manualPage:
      'https://github.com/candemiroguzhan/gaussian-splats-web-viewer/blob/master/public/goksu.ply',
  },
];

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const request = https.get(url, (response) => {
      if (
        response.statusCode >= 300 &&
        response.statusCode < 400 &&
        response.headers.location
      ) {
        file.close();
        if (fs.existsSync(dest)) fs.unlinkSync(dest);
        return resolve(download(response.headers.location, dest));
      }
      if (response.statusCode !== 200) {
        file.close();
        if (fs.existsSync(dest)) fs.unlinkSync(dest);
        return reject(new Error(`HTTP ${response.statusCode}`));
      }
      response.pipe(file);
      file.on('finish', () => file.close(resolve));
    });

    request.on('error', (err) => {
      file.close();
      if (fs.existsSync(dest)) fs.unlinkSync(dest);
      reject(err);
    });

    request.setTimeout(120_000, () => {
      request.destroy(new Error('Download timed out after 120s'));
    });
  });
}

async function tryDownloadSample(sample) {
  const dest = path.join(OUT_DIR, sample.name);
  let lastError = null;

  for (const url of sample.urls) {
    process.stdout.write(`  trying ${new URL(url).hostname}... `);
    try {
      await download(url, dest);
      const sizeMb = (fs.statSync(dest).size / (1024 * 1024)).toFixed(1);
      console.log(`OK (${sizeMb} MB)`);
      return true;
    } catch (error) {
      console.log(`failed (${error.message})`);
      lastError = error;
    }
  }

  throw lastError ?? new Error('All download URLs failed');
}

function ensureOfflineFixtures() {
  const minimalScript = path.join(OUT_DIR, 'generate-3dgs-ply.js');
  const demoScript = path.join(OUT_DIR, 'generate-demo-sphere-3dgs.js');

  if (!fs.existsSync(path.join(OUT_DIR, 'sample-3dgs.ply'))) {
    require(minimalScript);
  }

  const demoPath = path.join(OUT_DIR, 'demo-sphere-3dgs.ply');
  if (!fs.existsSync(demoPath)) {
    console.log('\nGenerating offline demo sphere (no internet needed)...');
    require(demoScript);
  }

  return demoPath;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  let anyDownloaded = false;

  for (const sample of SAMPLES) {
    console.log(`\n${sample.name}: ${sample.note}`);
    try {
      await tryDownloadSample(sample);
      anyDownloaded = true;
    } catch (error) {
      const isDns =
        error.code === 'ENOTFOUND' ||
        error.message.includes('ENOTFOUND') ||
        error.message.includes('getaddrinfo');
      console.log(`\nAll mirrors failed for ${sample.name}.`);
      if (isDns) {
        console.log(
          '  DNS could not reach GitHub CDN (common on restricted networks).',
        );
        console.log('  Try: change DNS to 8.8.8.8, use VPN, or download manually:');
        if (sample.manualPage) {
          console.log(`    GitHub (Download button): ${sample.manualPage}`);
        }
        for (const url of sample.urls) {
          console.log(`    Direct raw URL: ${url}`);
        }
        console.log(
          '  Note: jsDelivr CDN cannot serve this file (63 MB > 20 MB limit).',
        );
      }
    }
  }

  const demoPath = ensureOfflineFixtures();

  console.log('\n--- Fixtures ready in test/fixtures/ ---');
  console.log('  sample-3dgs.ply       — 5 gaussians (automated tests only)');
  console.log(`  demo-sphere-3dgs.ply  — 1200 gaussians (import this for a visible demo)`);
  if (anyDownloaded) {
    console.log('  goksu-3dgs.ply        — full photorealistic scene (~63 MB)');
  }
  console.log('\nImport demo sphere:');
  console.log(
    '  curl -X POST http://localhost:4000/imports -H "Authorization: Bearer TOKEN" -F "file=@test/fixtures/demo-sphere-3dgs.ply" -F "title=Demo Sphere"',
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
