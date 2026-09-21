import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { closeTestApp, createTestApp } from './helpers/test-app.helper';

describe('Sprint B1 — Foundation (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  }, 120000);

  afterAll(async () => {
    await closeTestApp(app);
  });

  it('TC-B1-01: server starts and confirms live DB connection', async () => {
    const response = await request(app.getHttpServer()).get('/health').expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('ok');
    expect(response.body.data.database).toBe('connected');
  });

  it('TC-B1-02: invalid DTO returns 400 with structured validation errors', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'not-an-email', password: 'short' })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.statusCode).toBe(400);
    expect(response.body.error).toBeDefined();
  });

  it('TC-B1-03: Swagger docs endpoint is available', async () => {
    await request(app.getHttpServer()).get('/api/docs').expect(200);
  });
});
