import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Scene } from '../scenes/schemas/scene.schema';
import { User } from '../users/schemas/user.schema';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { FlagSceneDto } from './dto/flag-scene.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(Scene.name) private readonly sceneModel: Model<Scene>,
  ) {}

  async listUsers(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      this.userModel
        .find()
        .select('-hashedPassword')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.userModel.countDocuments(),
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateUserStatus(userId: string, dto: UpdateUserStatusDto) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new NotFoundException('Invalid user ID');
    }

    const user = await this.userModel
      .findByIdAndUpdate(
        userId,
        { $set: { isSuspended: dto.isSuspended } },
        { new: true },
      )
      .select('-hashedPassword')
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async listFlaggedScenes(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [scenes, total] = await Promise.all([
      this.sceneModel
        .find({ isFlagged: true })
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.sceneModel.countDocuments({ isFlagged: true }),
    ]);

    return {
      scenes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async flagScene(sceneId: string, dto: FlagSceneDto) {
    if (!Types.ObjectId.isValid(sceneId)) {
      throw new NotFoundException('Invalid scene ID');
    }

    const scene = await this.sceneModel
      .findByIdAndUpdate(
        sceneId,
        {
          $set: {
            isFlagged: dto.isFlagged,
            flagReason: dto.flagReason || (dto.isFlagged ? 'Flagged by admin' : ''),
          },
        },
        { new: true },
      )
      .exec();

    if (!scene) {
      throw new NotFoundException('Scene not found');
    }

    return scene;
  }
}
