import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { closeTestApp, createTestApp } from './helpers/test-app.helper';

describe('Public Slice Endpoint — POST /api/public/slice (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  }, 120000);

  afterAll(async () => {
    await closeTestApp(app);
  });

  it('TC-PUBLIC-SLICE-01: computes validated tesseract cross-section with zero auth headers', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/public/slice')
      .send({
        polytope: 'tesseract',
        hyperplane: {
          normal: [0, 0, 0, 1],
          offset: 0.5,
        },
      })
      .expect(200);

    const data = response.body.data;
    expect(response.body.success).toBe(true);
    expect(data.polytope).toBe('tesseract');
    expect(data.vertexCount).toBe(8);
    expect(data.faceCount).toBe(6);
    expect(data.shapeClassification).toBe('Cube');
    expect(data.convex).toBe(true);
    expect(data.coplanar).toBe(true);
    expect(data.watertight).toBe(true);
    expect(typeof data.computeTimeMs).toBe('number');
  });

  it('TC-PUBLIC-SLICE-02: returns 400 Bad Request on invalid polytope name', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/public/slice')
      .send({
        polytope: 'invalid_polytope',
        hyperplane: {
          normal: [0, 0, 0, 1],
          offset: 0.5,
        },
      })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.statusCode).toBe(400);
    expect(response.body.error).toBeDefined();
  });

  it('TC-PUBLIC-SLICE-03: returns 400 Bad Request on malformed hyperplane normal (wrong array size)', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/public/slice')
      .send({
        polytope: 'tesseract',
        hyperplane: {
          normal: [0, 1, 2], // Only 3 elements instead of 4
          offset: 0.5,
        },
      })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.statusCode).toBe(400);
  });

  it('TC-PUBLIC-SLICE-04: returns 400 Bad Request when hyperplane offset is missing', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/public/slice')
      .send({
        polytope: 'tesseract',
        hyperplane: {
          normal: [0, 0, 0, 1],
        },
      })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.statusCode).toBe(400);
  });

  it('TC-PUBLIC-SLICE-05: rate limiter enforces limit threshold', async () => {
    const payload = {
      polytope: 'tesseract',
      hyperplane: {
        normal: [0, 0, 0, 1],
        offset: 0.0,
      },
    };

    // Send requests up to the threshold of 20
    for (let i = 0; i < 20; i++) {
      const res = await request(app.getHttpServer())
        .post('/api/public/slice')
        .send(payload);
      // Status should be 200 (or 429 if already throttled from prior tests)
      expect([200, 429]).toContain(res.status);
    }

    // Next request should trigger HTTP 429 Too Many Requests
    const throtRes = await request(app.getHttpServer())
      .post('/api/public/slice')
      .send(payload);

    expect(throtRes.status).toBe(429);
  });
});
