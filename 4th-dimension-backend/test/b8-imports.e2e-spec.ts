import { INestApplication } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as request from 'supertest';
import {
  closeTestApp,
  createTestApp,
  registerUser,
} from './helpers/test-app.helper';

const FIXTURES = path.join(__dirname, 'fixtures');

function errorText(body: { error?: unknown }): string {
  if (typeof body.error === 'string') {
    return body.error;
  }
  if (
    body.error &&
    typeof body.error === 'object' &&
    'message' in body.error
  ) {
    const message = (body.error as { message: string | string[] }).message;
    return Array.isArray(message) ? message.join(' ') : message;
  }
  return JSON.stringify(body.error ?? '');
}

async function waitForImport(
  app: INestApplication,
  token: string,
  jobId: string,
  timeoutMs = 15000,
) {
  const started = Date.now();
  let lastStatus = '';

  while (Date.now() - started < timeoutMs) {
    const response = await request(app.getHttpServer())
      .get(`/imports/${jobId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const job = response.body.data;
    lastStatus = job.status;

    if (job.status === 'complete') {
      return job;
    }
    if (job.status === 'failed') {
      throw new Error(`Import failed: ${job.errorMessage}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  throw new Error(`Import timed out (last status: ${lastStatus})`);
}

describe('Sprint B8 — Asset Upload and Gaussian Import (e2e)', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    const plyPath = path.join(FIXTURES, 'sample-3dgs.ply');
    if (!fs.existsSync(plyPath)) {
      const { execFileSync } = require('child_process');
      execFileSync('node', [path.join(FIXTURES, 'generate-3dgs-ply.js')], {
        stdio: 'inherit',
      });
    }

    app = await createTestApp();
    const user = await registerUser(app, 'b8-imports@test.dev');
    token = user.accessToken;
  }, 120000);

  afterAll(async () => {
    await closeTestApp(app);
  });

  it('TC-B8-01: upload valid native JSON creates import job and scene', async () => {
    const jsonPath = path.join(FIXTURES, 'sample-native.json');
    const upload = await request(app.getHttpServer())
      .post('/imports')
      .set('Authorization', `Bearer ${token}`)
      .field('title', 'E2E Native Import')
      .field('duration', '4')
      .attach('file', jsonPath)
      .expect(201);

    expect(upload.body.data.status).toBe('pending');
    expect(upload.body.data.detectedFormat).toBe('native-json');

    const job = await waitForImport(app, token, upload.body.data.id);
    expect(job.status).toBe('complete');
    expect(job.progress).toBe(100);
    expect(job.sceneId).toBeTruthy();
    expect(job.primitiveCount).toBe(3);

    const scene = await request(app.getHttpServer())
      .get(`/scenes/${job.sceneId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(scene.body.data.title).toBe('E2E Native Import');
    expect(scene.body.data.primitiveCount).toBe(3);

    const primitives = await request(app.getHttpServer())
      .get(`/scenes/${job.sceneId}/primitives`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(primitives.body.data.primitives).toHaveLength(3);
  });

  it('TC-B8-01b: upload valid 3DGS PLY creates import job and scene', async () => {
    const plyPath = path.join(FIXTURES, 'sample-3dgs.ply');
    expect(fs.existsSync(plyPath)).toBe(true);

    const upload = await request(app.getHttpServer())
      .post('/imports')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', plyPath)
      .expect(201);

    expect(upload.body.data.detectedFormat).toBe('3dgs-ply');

    const job = await waitForImport(app, token, upload.body.data.id);
    expect(job.status).toBe('complete');
    expect(job.primitiveCount).toBe(5);
  });

  it('TC-B8-02: reject unsupported file type', async () => {
    const badFile = path.join(FIXTURES, 'bad-upload.txt');
    fs.writeFileSync(badFile, 'not a gaussian model');

    const response = await request(app.getHttpServer())
      .post('/imports')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', badFile)
      .expect(400);

    expect(errorText(response.body)).toMatch(/unsupported file extension/i);
    fs.unlinkSync(badFile);
  });

  it('TC-B8-02b: reject oversized file', async () => {
    const { Test } = require('@nestjs/testing');
    const { MongoMemoryServer } = require('mongodb-memory-server');
    const { configureApp } = require('../src/app.bootstrap');
    const { AppModule } = require('../src/app.module');

    process.env.IMPORT_MAX_FILE_BYTES = '32';
    const mongod = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongod.getUri('4th-dimension-b8-size');
    process.env.JWT_ACCESS_SECRET = 'test-access-secret-min-32-characters';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-min-32-characters';

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    const sizeApp = moduleRef.createNestApplication();
    configureApp(sizeApp);
    await sizeApp.init();

    try {
      const user = await registerUser(sizeApp, 'b8-size@test.dev');
      const jsonPath = path.join(FIXTURES, 'sample-native.json');

      const response = await request(sizeApp.getHttpServer())
        .post('/imports')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .attach('file', jsonPath)
        .expect(400);

      expect(errorText(response.body)).toMatch(/exceeds maximum size/i);
    } finally {
      delete process.env.IMPORT_MAX_FILE_BYTES;
      await sizeApp.close();
      await mongod.stop();
    }
  }, 120000);

  it('TC-B8-03: import status transitions pending → processing → complete', async () => {
    const jsonPath = path.join(FIXTURES, 'sample-native.json');
    const upload = await request(app.getHttpServer())
      .post('/imports')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', jsonPath)
      .expect(201);

    const jobId = upload.body.data.id;
    const seen = new Set<string>();

    const started = Date.now();
    while (Date.now() - started < 15000) {
      const response = await request(app.getHttpServer())
        .get(`/imports/${jobId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      seen.add(response.body.data.status);

      if (response.body.data.status === 'complete') {
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, 20));
    }

    expect(seen.has('pending') || seen.has('processing')).toBe(true);
    expect(seen.has('complete')).toBe(true);
  });
});
