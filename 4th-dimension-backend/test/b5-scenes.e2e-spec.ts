import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import {
  closeTestApp,
  createTestApp,
  registerUser,
} from './helpers/test-app.helper';

describe('Sprint B5 — Scene CRUD (e2e)', () => {
  let app: INestApplication;
  let user1Token: string;
  let user1Id: string;
  let user2Token: string;

  beforeAll(async () => {
    app = await createTestApp();

    const user1 = await registerUser(app, 'b5-owner@test.dev');
    user1Token = user1.accessToken;
    user1Id = user1.userId;

    const user2 = await registerUser(app, 'b5-other@test.dev');
    user2Token = user2.accessToken;
  }, 120000);

  afterAll(async () => {
    await closeTestApp(app);
  });

  it('TC-B5-01: create scene sets correct ownerId', async () => {
    const response = await request(app.getHttpServer())
      .post('/scenes')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        title: 'Test Hypercube',
        description: 'A 4D scene',
        tags: ['demo'],
        metadata: { duration: 5 },
      })
      .expect(201);

    expect(response.body.data.title).toBe('Test Hypercube');
    expect(response.body.data.ownerId).toBe(user1Id);
    expect(response.body.data.metadata.duration).toBe(5);
  });

  it('TC-B5-02: updating another users scene returns 403', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/scenes')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ title: 'Protected Scene' })
      .expect(201);

    const sceneId = createResponse.body.data.id;

    const response = await request(app.getHttpServer())
      .patch(`/scenes/${sceneId}`)
      .set('Authorization', `Bearer ${user2Token}`)
      .send({ title: 'Hijacked' })
      .expect(403);

    expect(response.body.success).toBe(false);
    expect(response.body.statusCode).toBe(403);
  });

  it('TC-B5-03: delete owned scene removes it from list', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/scenes')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ title: 'Scene To Delete' })
      .expect(201);

    const sceneId = createResponse.body.data.id;

    await request(app.getHttpServer())
      .delete(`/scenes/${sceneId}`)
      .set('Authorization', `Bearer ${user1Token}`)
      .expect(200);

    await request(app.getHttpServer())
      .get(`/scenes/${sceneId}`)
      .set('Authorization', `Bearer ${user1Token}`)
      .expect(404);

    const listResponse = await request(app.getHttpServer())
      .get('/scenes')
      .set('Authorization', `Bearer ${user1Token}`)
      .expect(200);

    const ids = listResponse.body.data.items.map((s: { id: string }) => s.id);
    expect(ids).not.toContain(sceneId);
  });
});
