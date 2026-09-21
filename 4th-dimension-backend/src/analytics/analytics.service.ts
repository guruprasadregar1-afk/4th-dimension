import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Scene } from '../scenes/schemas/scene.schema';
import { User } from '../users/schemas/user.schema';
import { SceneGateway } from '../events/scene.gateway';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(Scene.name) private readonly sceneModel: Model<Scene>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly sceneGateway: SceneGateway,
  ) {}

  async getOverviewMetrics() {
    const [totalUsers, totalScenes, aggregatedStats] = await Promise.all([
      this.userModel.countDocuments(),
      this.sceneModel.countDocuments(),
      this.sceneModel.aggregate([
        {
          $group: {
            _id: null,
            totalPrimitives: { $sum: '$primitiveCount' },
            totalStorageBytes: { $sum: '$storageSizeBytes' },
            avgPrimitiveCount: { $avg: '$primitiveCount' },
          },
        },
      ]),
    ]);

    const stats = aggregatedStats[0] || {
      totalPrimitives: 0,
      totalStorageBytes: 0,
      avgPrimitiveCount: 0,
    };

    const activeConnections = this.sceneGateway.getTotalActiveConnections();

    return {
      totalUsers,
      totalScenes,
      totalPrimitives: stats.totalPrimitives,
      totalStorageBytes: stats.totalStorageBytes,
      avgPrimitivesPerScene: Math.round(stats.avgPrimitiveCount || 0),
      activeRealtimeConnections: activeConnections,
      timestamp: new Date().toISOString(),
    };
  }

  async getSceneMetrics(sceneId: string) {
    if (!Types.ObjectId.isValid(sceneId)) {
      throw new NotFoundException('Invalid scene ID');
    }

    const scene = await this.sceneModel.findById(sceneId).exec();
    if (!scene) {
      throw new NotFoundException('Scene not found');
    }

    const activeViewers = this.sceneGateway.getActiveViewerCount(sceneId);
    const duration = (scene.metadata as any)?.duration || 0;

    // Calculate complexity rating based on primitive count
    let complexityGrade = 'LOW';
    if (scene.primitiveCount > 100000) complexityGrade = 'HIGH';
    else if (scene.primitiveCount > 25000) complexityGrade = 'MEDIUM';

    return {
      sceneId: scene._id.toString(),
      title: scene.title,
      ownerId: scene.ownerId,
      primitiveCount: scene.primitiveCount,
      storageSizeBytes: scene.storageSizeBytes,
      storageType: scene.storageType,
      durationSeconds: duration,
      complexityGrade,
      activeViewers,
      isFlagged: scene.isFlagged || false,
      createdAt: scene.createdAt,
      updatedAt: scene.updatedAt,
    };
  }
}
