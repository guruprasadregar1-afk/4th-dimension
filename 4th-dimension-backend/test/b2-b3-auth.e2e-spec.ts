import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import {
  closeTestApp,
  createTestApp,
  registerUser,
} from './helpers/test-app.helper';

describe('Sprint B2–B3 — Authentication (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  }, 120000);

  afterAll(async () => {
    await closeTestApp(app);
  });

  it('TC-B2-01: register creates a user account', async () => {
    const tokens = await registerUser(app, 'b2-register@test.dev');

    expect(tokens.accessToken).toBeDefined();
    expect(tokens.refreshToken).toBeDefined();
    expect(tokens.userId).toBeDefined();
  });

  it('TC-B2-02: login returns access and refresh tokens', async () => {
    await registerUser(app, 'b2-login@test.dev');

    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'b2-login@test.dev', password: 'TestPass123!' })
      .expect(201);

    expect(response.body.data.accessToken).toBeDefined();
    expect(response.body.data.refreshToken).toBeDefined();
    expect(response.body.data.user.email).toBe('b2-login@test.dev');
  });

  it('TC-B2-03: duplicate registration returns 409', async () => {
    await registerUser(app, 'b2-dup@test.dev');

    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'b2-dup@test.dev', password: 'TestPass123!' })
      .expect(409);

    expect(response.body.success).toBe(false);
  });

  it('TC-B3-01: refresh token rotation issues new token pair', async () => {
    const tokens = await registerUser(app, 'b3-refresh@test.dev');

    const response = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: tokens.refreshToken })
      .expect(201);

    expect(response.body.data.accessToken).toBeDefined();
    expect(response.body.data.refreshToken).toBeDefined();
    expect(response.body.data.refreshToken).not.toBe(tokens.refreshToken);
  });

  it('TC-B3-02: refresh token reuse is rejected', async () => {
    const tokens = await registerUser(app, 'b3-reuse@test.dev');

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: tokens.refreshToken })
      .expect(201);

    const response = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: tokens.refreshToken })
      .expect(401);

    expect(response.body.success).toBe(false);
  });

  it('TC-B3-03: protected route requires Bearer token', async () => {
    await request(app.getHttpServer()).get('/users/me').expect(401);
  });

  it('TC-B3-04: logout revokes refresh token family', async () => {
    const tokens = await registerUser(app, 'b3-logout@test.dev');

    await request(app.getHttpServer())
      .post('/auth/logout')
      .send({ refreshToken: tokens.refreshToken })
      .expect(201);

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: tokens.refreshToken })
      .expect(401);
  });
});
