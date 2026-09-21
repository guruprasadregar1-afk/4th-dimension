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

describe('Sprint B10 — Response caching (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let otherToken: string;
  let sceneId: string;

  beforeAll(async () => {
    process.env.CACHE_ENABLED = 'true';
    app = await createTestApp();

    const user = await registerUser(app, 'b10-cache@test.dev');
    token = user.accessToken;

    const otherUser = await registerUser(app, 'b10-other@test.dev');
    otherToken = otherUser.accessToken;

    const scene = await request(app.getHttpServer())
      .post('/scenes')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Cache Test Scene' })
      .expect(201);

    sceneId = scene.body.data.id;

    await request(app.getHttpServer())
      .put(`/scenes/${sceneId}/primitives`)
      .set('Authorization', `Bearer ${token}`)
      .send({ primitives: [makePrimitive(0), makePrimitive(1)], duration: 3 })
      .expect(200);
  }, 120000);

  afterAll(async () => {
    delete process.env.CACHE_ENABLED;
    await closeTestApp(app);
  });

  it('TC-B10-01: repeated GET /scenes/:id/primitives returns X-Cache HIT', async () => {
    const first = await request(app.getHttpServer())
      .get(`/scenes/${sceneId}/primitives`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(first.headers['x-cache']).toBe('MISS');
    expect(first.body.data.primitives).toHaveLength(2);

    const second = await request(app.getHttpServer())
      .get(`/scenes/${sceneId}/primitives`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(second.headers['x-cache']).toBe('HIT');
    expect(second.body.data.primitives).toHaveLength(2);
  });

  it('TC-B10-02: PUT /scenes/:id/primitives invalidates cache', async () => {
    await request(app.getHttpServer())
      .get(`/scenes/${sceneId}/primitives`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    await request(app.getHttpServer())
      .put(`/scenes/${sceneId}/primitives`)
      .set('Authorization', `Bearer ${token}`)
      .send({ primitives: [makePrimitive(9)], duration: 7 })
      .expect(200);

    const afterUpload = await request(app.getHttpServer())
      .get(`/scenes/${sceneId}/primitives`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(afterUpload.headers['x-cache']).toBe('MISS');
    expect(afterUpload.body.data.primitives).toHaveLength(1);
    expect(afterUpload.body.data.duration).toBe(7);

    const cachedAgain = await request(app.getHttpServer())
      .get(`/scenes/${sceneId}/primitives`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(cachedAgain.headers['x-cache']).toBe('HIT');
  });

  it('TC-B10-03: PATCH /scenes/:id invalidates scene metadata cache', async () => {
    const first = await request(app.getHttpServer())
      .get(`/scenes/${sceneId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(first.headers['x-cache']).toBe('MISS');

    await request(app.getHttpServer())
      .get(`/scenes/${sceneId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/scenes/${sceneId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Updated Cache Title' })
      .expect(200);

    const afterPatch = await request(app.getHttpServer())
      .get(`/scenes/${sceneId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(afterPatch.headers['x-cache']).toBe('MISS');
    expect(afterPatch.body.data.title).toBe('Updated Cache Title');
  });

  it('TC-B10-04: DELETE /scenes/:id clears cache; subsequent GET returns 404', async () => {
    const deleteScene = await request(app.getHttpServer())
      .post('/scenes')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Delete Cache Scene' })
      .expect(201);

    const deleteSceneId = deleteScene.body.data.id;

    await request(app.getHttpServer())
      .put(`/scenes/${deleteSceneId}/primitives`)
      .set('Authorization', `Bearer ${token}`)
      .send({ primitives: [makePrimitive(0)] })
      .expect(200);

    await request(app.getHttpServer())
      .get(`/scenes/${deleteSceneId}/primitives`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    await request(app.getHttpServer())
      .delete(`/scenes/${deleteSceneId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    await request(app.getHttpServer())
      .get(`/scenes/${deleteSceneId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404);

    await request(app.getHttpServer())
      .get(`/scenes/${deleteSceneId}/primitives`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
  });

  it('TC-B10-05: cache is scoped per owner (403 for wrong owner)', async () => {
    await request(app.getHttpServer())
      .get(`/scenes/${sceneId}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(403);
  });

  it('TC-B10-06: CACHE_ENABLED=false bypasses cache', async () => {
    process.env.CACHE_ENABLED = 'false';

    const bypassApp = await createTestApp();
    const bypassUser = await registerUser(bypassApp, 'b10-bypass@test.dev');

    const scene = await request(bypassApp.getHttpServer())
      .post('/scenes')
      .set('Authorization', `Bearer ${bypassUser.accessToken}`)
      .send({ title: 'Bypass Scene' })
      .expect(201);

    await request(bypassApp.getHttpServer())
      .put(`/scenes/${scene.body.data.id}/primitives`)
      .set('Authorization', `Bearer ${bypassUser.accessToken}`)
      .send({ primitives: [makePrimitive(0)] })
      .expect(200);

    const first = await request(bypassApp.getHttpServer())
      .get(`/scenes/${scene.body.data.id}/primitives`)
      .set('Authorization', `Bearer ${bypassUser.accessToken}`)
      .expect(200);

    const second = await request(bypassApp.getHttpServer())
      .get(`/scenes/${scene.body.data.id}/primitives`)
      .set('Authorization', `Bearer ${bypassUser.accessToken}`)
      .expect(200);

    expect(first.headers['x-cache']).toBe('BYPASS');
    expect(second.headers['x-cache']).toBe('BYPASS');

    await closeTestApp(bypassApp);
    process.env.CACHE_ENABLED = 'true';
  }, 120000);
});
