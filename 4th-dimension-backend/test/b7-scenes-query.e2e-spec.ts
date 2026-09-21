import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import {
  closeTestApp,
  createTestApp,
  registerUser,
} from './helpers/test-app.helper';

describe('Sprint B7 — Scene Query (e2e)', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    app = await createTestApp();
    const user = await registerUser(app, 'b7-query@test.dev');
    token = user.accessToken;

    const titles = ['Alpha Hypercube', 'Beta Sphere', 'Gamma Tesseract'];
    for (let i = 0; i < titles.length; i++) {
      const scene = await request(app.getHttpServer())
        .post('/scenes')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: titles[i],
          tags: [i === 0 ? 'alpha' : i === 1 ? 'beta' : 'gamma'],
          metadata: { duration: (i + 1) * 2 },
        })
        .expect(201);

      await request(app.getHttpServer())
        .put(`/scenes/${scene.body.data.id}/primitives`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          duration: (i + 1) * 2,
          primitives: Array.from({ length: (i + 1) * 10 }, (_, j) => ({
            mean: [j, 0, 0, 0],
            covariance: Array(16).fill(0.04),
            color: [1, 0, 0, 1],
            alpha: 0.9,
          })),
        })
        .expect(200);
    }
  }, 120000);

  afterAll(async () => {
    await closeTestApp(app);
  });

  it('TC-B7-01: pagination returns correct subset and metadata', async () => {
    const page1 = await request(app.getHttpServer())
      .get('/scenes?limit=2&offset=0')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(page1.body.data.items).toHaveLength(2);
    expect(page1.body.data.pagination.total).toBe(3);
    expect(page1.body.data.pagination.limit).toBe(2);
    expect(page1.body.data.pagination.offset).toBe(0);
    expect(page1.body.data.pagination.hasMore).toBe(true);

    const page2 = await request(app.getHttpServer())
      .get('/scenes?limit=2&offset=2')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(page2.body.data.items).toHaveLength(1);
    expect(page2.body.data.pagination.hasMore).toBe(false);
  });

  it('TC-B7-02: search by title substring returns matching scenes', async () => {
    const response = await request(app.getHttpServer())
      .get('/scenes?search=Hypercube')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.data.items).toHaveLength(1);
    expect(response.body.data.items[0].title).toContain('Hypercube');
  });

  it('TC-B7-03: filter by primitive count range', async () => {
    const response = await request(app.getHttpServer())
      .get('/scenes?minPrimitiveCount=20&maxPrimitiveCount=30')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.data.items.length).toBeGreaterThanOrEqual(1);
    for (const scene of response.body.data.items) {
      expect(scene.primitiveCount).toBeGreaterThanOrEqual(20);
      expect(scene.primitiveCount).toBeLessThanOrEqual(30);
    }
  });

  it('TC-B7-04: filter by duration range', async () => {
    const response = await request(app.getHttpServer())
      .get('/scenes?minDuration=4&maxDuration=6')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    for (const scene of response.body.data.items) {
      expect(scene.metadata.duration).toBeGreaterThanOrEqual(4);
      expect(scene.metadata.duration).toBeLessThanOrEqual(6);
    }
  });
});
