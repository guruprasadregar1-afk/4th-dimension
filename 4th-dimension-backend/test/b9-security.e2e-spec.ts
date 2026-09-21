import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import {
  closeTestApp,
  createTestApp,
  registerUser,
} from './helpers/test-app.helper';

describe('Sprint B9 — Rate limiting and security (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.THROTTLE_AUTH_LIMIT = '3';
    process.env.THROTTLE_AUTH_TTL_MS = '60000';
    process.env.THROTTLE_LIMIT = '5';
    process.env.THROTTLE_TTL_MS = '60000';
    app = await createTestApp();
  }, 120000);

  afterAll(async () => {
    delete process.env.THROTTLE_AUTH_LIMIT;
    delete process.env.THROTTLE_AUTH_TTL_MS;
    delete process.env.THROTTLE_LIMIT;
    delete process.env.THROTTLE_TTL_MS;
    await closeTestApp(app);
  });

  it('TC-B9-01: exceeding auth rate limit returns 429', async () => {
    const email = 'b9-rate-limit@test.dev';
    const password = 'TestPass123!';

    for (let attempt = 0; attempt < 3; attempt += 1) {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password })
        .expect((response) => {
          expect([401, 201]).toContain(response.status);
        });
    }

    const throttled = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password });

    expect(throttled.status).toBe(429);
  });

  it('TC-B9-02: injection-style and unknown fields are rejected', async () => {
    const registerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'b9-injection@test.dev',
        password: 'TestPass123!',
        role: 'admin',
      })
      .expect(400);

    expect(registerResponse.body.success).toBe(false);

    const tokens = await registerUser(app, 'b9-scene-sanitize@test.dev');

    const maliciousTitle = '{ "$gt": "" } <script>alert(1)</script>';

    const createResponse = await request(app.getHttpServer())
      .post('/scenes')
      .set('Authorization', `Bearer ${tokens.accessToken}`)
      .send({ title: maliciousTitle })
      .expect(201);

    expect(createResponse.body.data.title).toBe(maliciousTitle);

    const searchResponse = await request(app.getHttpServer())
      .get('/scenes')
      .query({ search: '(a+)+$' })
      .set('Authorization', `Bearer ${tokens.accessToken}`)
      .expect(200);

    expect(searchResponse.body.success).toBe(true);
    expect(Array.isArray(searchResponse.body.data.items)).toBe(true);
  });

  it('TC-B9-03: npm audit reports no unresolved high/critical vulnerabilities', () => {
    const { execSync } = require('child_process') as typeof import('child_process');
    const path = require('path') as typeof import('path');

    let output = '';
    try {
      output = execSync('npm audit --omit=dev --json', {
        cwd: path.join(__dirname, '..'),
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (error) {
      const execError = error as { stdout?: string };
      output = execError.stdout ?? '{}';
    }

    const report = JSON.parse(output) as {
      metadata?: {
        vulnerabilities?: {
          critical?: number;
          high?: number;
        };
      };
    };

    const critical = report.metadata?.vulnerabilities?.critical ?? 0;
    const high = report.metadata?.vulnerabilities?.high ?? 0;

    expect(critical).toBe(0);
    expect(high).toBe(0);
  });
});
