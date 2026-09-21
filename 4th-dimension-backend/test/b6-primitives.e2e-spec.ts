import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import {
  closeTestApp,
  createTestApp,
  registerUser,
} from './helpers/test-app.helper';

function makePrimitive(index: number) {
  return {
    mean: [index, 0, 0, 0],
    covariance: Array.from({ length: 16 }, () => 0.04),
    color: [0.2, 0.6, 1, 1],
    alpha: 0.9,
  };
}

function makePrimitives(count: number) {
  return Array.from({ length: count }, (_, i) => makePrimitive(i));
}

describe('Sprint B6 — Primitive Storage (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let sceneId: string;

  beforeAll(async () => {
    process.env.PRIMITIVE_EMBEDDED_MAX_BYTES = '2048';

    app = await createTestApp();
    const user = await registerUser(app, 'b6-primitives@test.dev');
    token = user.accessToken;

    const scene = await request(app.getHttpServer())
      .post('/scenes')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Primitive Storage Test' })
      .expect(201);

    sceneId = scene.body.data.id;
  }, 120000);

  afterAll(async () => {
    delete process.env.PRIMITIVE_EMBEDDED_MAX_BYTES;
    await closeTestApp(app);
  });

  it('TC-B6-01: upload under size limit stores embedded primitives', async () => {
    const primitives = makePrimitives(2);

    const upload = await request(app.getHttpServer())
      .put(`/scenes/${sceneId}/primitives`)
      .set('Authorization', `Bearer ${token}`)
      .send({ primitives, duration: 5 })
      .expect(200);

    expect(upload.body.data.storageType).toBe('embedded');
    expect(upload.body.data.primitiveCount).toBe(2);

    const fetch = await request(app.getHttpServer())
      .get(`/scenes/${sceneId}/primitives`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(fetch.body.data.primitives).toHaveLength(2);
    expect(fetch.body.data.duration).toBe(5);
  });

  it('TC-B6-02: upload over size limit stores via GridFS', async () => {
    const largeScene = await request(app.getHttpServer())
      .post('/scenes')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Large Primitive Scene' })
      .expect(201);

    const largeSceneId = largeScene.body.data.id;
    const primitives = makePrimitives(80);

    const upload = await request(app.getHttpServer())
      .put(`/scenes/${largeSceneId}/primitives`)
      .set('Authorization', `Bearer ${token}`)
      .send({ primitives, duration: 10 })
      .expect(200);

    expect(upload.body.data.storageType).toBe('gridfs');
    expect(upload.body.data.primitiveCount).toBe(80);
    expect(upload.body.data.storageSizeBytes).toBeGreaterThan(2048);
  });

  it('TC-B6-03: fetch returns identical format for embedded and GridFS scenes', async () => {
    const embeddedFetch = await request(app.getHttpServer())
      .get(`/scenes/${sceneId}/primitives`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const largeScene = await request(app.getHttpServer())
      .get('/scenes')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const gridScene = largeScene.body.data.items.find(
      (s: { title: string }) => s.title === 'Large Primitive Scene',
    );

    const gridFetch = await request(app.getHttpServer())
      .get(`/scenes/${gridScene.id}/primitives`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(Object.keys(embeddedFetch.body.data).sort()).toEqual(
      Object.keys(gridFetch.body.data).sort(),
    );
    expect(embeddedFetch.body.data).toMatchObject({
      id: expect.any(String),
      title: expect.any(String),
      duration: expect.any(Number),
      primitives: expect.any(Array),
    });
    expect(gridFetch.body.data.primitives[0]).toMatchObject({
      mean: expect.any(Array),
      covariance: expect.any(Array),
      color: expect.any(Array),
      alpha: expect.any(Number),
    });
  });
});
