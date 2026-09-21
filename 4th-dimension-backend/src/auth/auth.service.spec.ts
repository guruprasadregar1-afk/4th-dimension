import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { getModelToken } from '@nestjs/mongoose';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { RefreshToken } from '../users/schemas/refresh-token.schema';
import { UserRole } from '../users/schemas/user.schema';
import { Types } from 'mongoose';
import * as bcrypt from 'bcrypt';

describe('AuthService - Refresh Token Grace Period', () => {
  let service: AuthService;

  const userId = new Types.ObjectId().toString();
  const mockUser = {
    id: userId,
    email: 'test@example.com',
    role: UserRole.USER,
    hashedPassword: 'hashedPassword123',
    isSuspended: false,
  };

  const mockUsersService = {
    findById: jest.fn().mockResolvedValue(mockUser),
    findByEmail: jest.fn().mockResolvedValue(mockUser),
    toPublicUser: jest.fn().mockReturnValue({ id: mockUser.id, email: mockUser.email, role: mockUser.role }),
  };

  const mockJwtService = {
    signAsync: jest.fn().mockResolvedValue('mock-access-token'),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultVal?: any) => defaultVal || 'test-secret'),
  };

  let tokenStore: any[] = [];

  const mockRefreshTokenModel = {
    findOne: jest.fn().mockImplementation(({ tokenHash }: { tokenHash: string }) => ({
      exec: jest.fn().mockResolvedValue(tokenStore.find((t) => t.tokenHash === tokenHash)),
    })),
    create: jest.fn().mockImplementation((data: any) => {
      const doc = {
        ...data,
        save: jest.fn().mockImplementation(function (this: any) {
          return Promise.resolve(this);
        }),
      };
      tokenStore.push(doc);
      return Promise.resolve(doc);
    }),
    updateMany: jest.fn().mockImplementation(({ family }: { family: string }, update: any) => {
      tokenStore.forEach((t) => {
        if (t.family === family) {
          Object.assign(t, update.$set);
        }
      });
      return { exec: jest.fn().mockResolvedValue({ modifiedCount: tokenStore.length }) };
    }),
  };

  beforeEach(async () => {
    tokenStore = [];
    jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(true));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: getModelToken(RefreshToken.name), useValue: mockRefreshTokenModel },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('allows concurrent refresh calls within 30-second grace period without throwing token reuse error', async () => {
    const loginResult = await service.login({ email: 'test@example.com', password: 'password123' });
    const initialRefresh = loginResult.refreshToken;

    const refreshResult1 = await service.refresh(initialRefresh);
    expect(refreshResult1.accessToken).toBe('mock-access-token');
    expect(refreshResult1.refreshToken).toBeDefined();

    const refreshResult2 = await service.refresh(initialRefresh);
    expect(refreshResult2.accessToken).toBe('mock-access-token');
    expect(refreshResult2.refreshToken).toBeDefined();
  });

  it('throws UnauthorizedException for refresh token reuse outside the grace period', async () => {
    const loginResult = await service.login({ email: 'test@example.com', password: 'password123' });
    const initialRefresh = loginResult.refreshToken;

    await service.refresh(initialRefresh);

    const stored = tokenStore.find((t) => t.revoked);
    if (stored) {
      stored.revokedAt = new Date(Date.now() - 60 * 1000);
    }

    await expect(service.refresh(initialRefresh)).rejects.toThrow(UnauthorizedException);
  });
});
