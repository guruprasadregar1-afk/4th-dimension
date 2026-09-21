import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { Model, Types } from 'mongoose';
import { UsersService } from '../users/users.service';
import { RefreshToken } from '../users/schemas/refresh-token.schema';
import { UserRole } from '../users/schemas/user.schema';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

const BCRYPT_ROUNDS = 12;

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    @InjectModel(RefreshToken.name)
    private readonly refreshTokenModel: Model<RefreshToken>,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.usersService.create({
      email: dto.email,
      hashedPassword,
      role: UserRole.USER,
    });

    const tokens = await this.issueTokenPair(
      user.id,
      user.email,
      user.role,
    );

    return {
      user: this.usersService.toPublicUser(user),
      ...tokens,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, user.hashedPassword);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.isSuspended) {
      throw new UnauthorizedException('Account has been suspended');
    }

    const tokens = await this.issueTokenPair(
      user.id,
      user.email,
      user.role,
    );

    return {
      user: this.usersService.toPublicUser(user),
      ...tokens,
    };
  }

  async refresh(refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);
    const stored = await this.refreshTokenModel
      .findOne({ tokenHash })
      .exec();

    if (!stored) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (stored.revoked) {
      const GRACE_PERIOD_MS = 30 * 1000; // 30-second grace period for concurrent requests
      const isWithinGracePeriod =
        stored.revokedAt &&
        Date.now() - new Date(stored.revokedAt).getTime() < GRACE_PERIOD_MS;

      if (!isWithinGracePeriod) {
        await this.revokeTokenFamily(stored.family);
        throw new UnauthorizedException('Refresh token reuse detected');
      }
    }

    if (stored.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    const user = await this.usersService.findById(stored.userId.toString());
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!stored.revoked) {
      stored.revoked = true;
      stored.revokedAt = new Date();
      await stored.save();
    }

    const tokens = await this.rotateRefreshToken(
      user.id,
      user.email,
      user.role,
      stored.family,
    );

    return {
      user: this.usersService.toPublicUser(user),
      ...tokens,
    };
  }

  async logout(refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);
    const stored = await this.refreshTokenModel
      .findOne({ tokenHash })
      .exec();

    if (stored && !stored.revoked) {
      await this.revokeTokenFamily(stored.family);
    }

    return { message: 'Logged out successfully' };
  }

  async getProfile(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return this.usersService.toPublicUser(user);
  }

  private async issueTokenPair(
    userId: string,
    email: string,
    role: UserRole,
  ): Promise<TokenPair> {
    const family = randomBytes(16).toString('hex');
    return this.rotateRefreshToken(userId, email, role, family);
  }

  private async rotateRefreshToken(
    userId: string,
    email: string,
    role: UserRole,
    family: string,
  ): Promise<TokenPair> {
    const accessToken = await this.signAccessToken(userId, email, role);
    const refreshToken = randomBytes(48).toString('hex');
    const expiresIn = this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');
    const expiresAt = this.parseExpiry(expiresIn);

    await this.refreshTokenModel.create({
      userId: new Types.ObjectId(userId),
      tokenHash: this.hashToken(refreshToken),
      family,
      expiresAt,
    });

    return { accessToken, refreshToken };
  }

  private async signAccessToken(
    userId: string,
    email: string,
    role: UserRole,
  ): Promise<string> {
    return this.jwtService.signAsync(
      { sub: userId, email, role },
      {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get<string>('JWT_ACCESS_EXPIRES_IN', '1h'),
      },
    );
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async revokeTokenFamily(family: string): Promise<void> {
    await this.refreshTokenModel.updateMany(
      { family },
      { $set: { revoked: true, revokedAt: new Date() } },
    );
  }

  private parseExpiry(value: string): Date {
    const match = /^(\d+)([smhd])$/.exec(value);
    if (!match) {
      return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    }

    const amount = Number(match[1]);
    const unit = match[2];
    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    return new Date(Date.now() + amount * multipliers[unit]);
  }

}
