import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import {
  closeTestApp,
  createTestApp,
  registerUser,
} from './helpers/test-app.helper';

function makePrimitive(index: number) {
  return {
    mean: [index, 0, 0, index * 0.1],
    covariance: Array.from({ length: 16 }, () => 0.04),
    color: [0.2, 0.6, 1, 1],
    alpha: 0.9,
  };
}

describe('Sprint B11 — Scene export and clone (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let otherToken: string;
  let sceneId: string;

  beforeAll(async () => {
    app = await createTestApp();
    const user = await registerUser(app, 'b11-export@test.dev');
    token = user.accessToken;

    const otherUser = await registerUser(app, 'b11-other@test.dev');
    otherToken = otherUser.accessToken;

    const scene = await request(app.getHttpServer())
      .post('/scenes')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Export Clone Source',
        description: 'B11 test scene',
        tags: ['b11', 'demo'],
        metadata: { duration: 4 },
      })
      .expect(201);

    sceneId = scene.body.data.id;

    await request(app.getHttpServer())
      .put(`/scenes/${sceneId}/primitives`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        duration: 4,
        primitives: [makePrimitive(0), makePrimitive(1), makePrimitive(2)],
      })
      .expect(200);
  }, 120000);

  afterAll(async () => {
    await closeTestApp(app);
  });

  it('TC-B11-01: GET /scenes/:id/export returns native re-importable JSON', async () => {
    const exported = await request(app.getHttpServer())
      .get(`/scenes/${sceneId}/export`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(exported.body.success).toBe(true);
    expect(exported.body.data.format).toBe('4d-native');
    expect(exported.body.data.title).toBe('Export Clone Source');
    expect(exported.body.data.duration).toBe(4);
    expect(exported.body.data.primitives).toHaveLength(3);
    expect(exported.body.data.exportedAt).toBeDefined();
  });

  it('TC-B11-02: POST /scenes/:id/clone duplicates scene and primitives', async () => {
    const cloned = await request(app.getHttpServer())
      .post(`/scenes/${sceneId}/clone`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Cloned Scene' })
      .expect(201);

    expect(cloned.body.data.title).toBe('Cloned Scene');
    expect(cloned.body.data.id).not.toBe(sceneId);
    expect(cloned.body.data.primitiveCount).toBe(3);

    const fetchClone = await request(app.getHttpServer())
      .get(`/scenes/${cloned.body.data.id}/primitives`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(fetchClone.body.data.primitives).toHaveLength(3);
    expect(fetchClone.body.data.duration).toBe(4);
  });

  it('TC-B11-03: clone defaults title to "(copy)" suffix', async () => {
    const cloned = await request(app.getHttpServer())
      .post(`/scenes/${sceneId}/clone`)
      .set('Authorization', `Bearer ${token}`)
      .send({})
      .expect(201);

    expect(cloned.body.data.title).toBe('Export Clone Source (copy)');
  });

  it('TC-B11-04: export and clone are owner-only', async () => {
    await request(app.getHttpServer())
      .get(`/scenes/${sceneId}/export`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(403);

    await request(app.getHttpServer())
      .post(`/scenes/${sceneId}/clone`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({})
      .expect(403);
  });

  it('TC-B11-05: exported JSON round-trips through native import upload', async () => {
    const exported = await request(app.getHttpServer())
      .get(`/scenes/${sceneId}/export`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const importPayload = {
      title: exported.body.data.title,
      duration: exported.body.data.duration,
      primitives: exported.body.data.primitives,
    };

    const importedScene = await request(app.getHttpServer())
      .post('/scenes')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Round-trip Import' })
      .expect(201);

    await request(app.getHttpServer())
      .put(`/scenes/${importedScene.body.data.id}/primitives`)
      .set('Authorization', `Bearer ${token}`)
      .send(importPayload)
      .expect(200);

    const fetchImported = await request(app.getHttpServer())
      .get(`/scenes/${importedScene.body.data.id}/primitives`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(fetchImported.body.data.primitives).toHaveLength(3);
  });
});
