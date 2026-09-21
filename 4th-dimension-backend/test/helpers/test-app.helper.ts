import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { configureApp } from '../../src/app.bootstrap';
import { AppModule } from '../../src/app.module';

let mongod: MongoMemoryServer;

export async function createTestApp(): Promise<INestApplication> {
  mongod = await MongoMemoryServer.create();

  process.env.MONGODB_URI = mongod.getUri('4th-dimension-test');
  process.env.JWT_ACCESS_SECRET = 'test-access-secret-min-32-characters';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-min-32-characters';
  process.env.JWT_ACCESS_EXPIRES_IN = '15m';
  process.env.JWT_REFRESH_EXPIRES_IN = '7d';

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  configureApp(app);
  await app.init();

  return app;
}

export async function closeTestApp(app: INestApplication): Promise<void> {
  await app.close();
  if (mongod) {
    await mongod.stop();
  }
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  userId: string;
  email: string;
}

export async function registerUser(
  app: INestApplication,
  email: string,
  password = 'TestPass123!',
): Promise<AuthTokens> {
  const request = require('supertest');
  const response = await request(app.getHttpServer())
    .post('/auth/register')
    .send({ email, password })
    .expect(201);

  const { user, accessToken, refreshToken } = response.body.data;

  return {
    accessToken,
    refreshToken,
    userId: user.id,
    email: user.email,
  };
}
