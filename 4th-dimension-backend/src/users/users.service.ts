import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { Model, Types } from 'mongoose';
import { RefreshToken } from './schemas/refresh-token.schema';
import { User, UserDocument } from './schemas/user.schema';
import { ChangePasswordDto } from './dto/change-password.dto';
import { DeleteAccountDto } from './dto/delete-account.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(RefreshToken.name)
    private readonly refreshTokenModel: Model<RefreshToken>,
  ) {}

  create(data: Pick<User, 'email' | 'hashedPassword' | 'role'>): Promise<UserDocument> {
    return this.userModel.create(data);
  }

  findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase() }).exec();
  }

  findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  async getProfile(userId: string) {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.toPublicUser(user);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!dto.email) {
      throw new BadRequestException('No profile fields to update');
    }

    const normalizedEmail = dto.email.toLowerCase();
    if (normalizedEmail === user.email) {
      return this.toPublicUser(user);
    }

    const existing = await this.findByEmail(normalizedEmail);
    if (existing && existing.id !== userId) {
      throw new ConflictException('Email already in use');
    }

    user.email = normalizedEmail;
    await user.save();

    return this.toPublicUser(user);
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const valid = await bcrypt.compare(dto.currentPassword, user.hashedPassword);
    if (!valid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException('New password must differ from current password');
    }

    user.hashedPassword = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);
    await user.save();

    await this.revokeAllUserTokens(userId);

    return { message: 'Password changed successfully. Please log in again.' };
  }

  async deleteAccount(userId: string, dto: DeleteAccountDto) {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const valid = await bcrypt.compare(dto.password, user.hashedPassword);
    if (!valid) {
      throw new UnauthorizedException('Password confirmation failed');
    }

    await this.revokeAllUserTokens(userId);
    await this.refreshTokenModel.deleteMany({ userId: new Types.ObjectId(userId) });
    await user.deleteOne();

    return { message: 'Account deleted successfully' };
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.refreshTokenModel.updateMany(
      { userId: new Types.ObjectId(userId) },
      { $set: { revoked: true } },
    );
  }

  toPublicUser(user: UserDocument) {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    };
  }
}
