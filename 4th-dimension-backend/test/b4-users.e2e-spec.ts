import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import {
  closeTestApp,
  createTestApp,
  registerUser,
} from './helpers/test-app.helper';

describe('Sprint B4 — User Profile (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  }, 120000);

  afterAll(async () => {
    await closeTestApp(app);
  });

  it('TC-B4-01: update profile with valid data', async () => {
    const tokens = await registerUser(app, 'b4-profile@test.dev');

    const response = await request(app.getHttpServer())
      .patch('/users/me')
      .set('Authorization', `Bearer ${tokens.accessToken}`)
      .send({ email: 'b4-updated@test.dev' })
      .expect(200);

    expect(response.body.data.email).toBe('b4-updated@test.dev');
  });

  it('TC-B4-02: change password invalidates old refresh tokens', async () => {
    const tokens = await registerUser(app, 'b4-password@test.dev');

    await request(app.getHttpServer())
      .patch('/users/me/password')
      .set('Authorization', `Bearer ${tokens.accessToken}`)
      .send({
        currentPassword: 'TestPass123!',
        newPassword: 'NewPass456!',
      })
      .expect(200);

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: tokens.refreshToken })
      .expect(401);

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'b4-password@test.dev', password: 'NewPass456!' })
      .expect(201);

    expect(loginResponse.body.data.accessToken).toBeDefined();
  });

  it('TC-B4-03: delete account removes user and revokes sessions', async () => {
    const tokens = await registerUser(app, 'b4-delete@test.dev');

    await request(app.getHttpServer())
      .delete('/users/me')
      .set('Authorization', `Bearer ${tokens.accessToken}`)
      .send({ password: 'TestPass123!' })
      .expect(200);

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'b4-delete@test.dev', password: 'TestPass123!' })
      .expect(401);

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: tokens.refreshToken })
      .expect(401);
  });
});
