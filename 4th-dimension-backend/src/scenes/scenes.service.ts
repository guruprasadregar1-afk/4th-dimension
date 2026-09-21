import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AppCacheService } from '../cache/app-cache.service';
import { CacheKeys } from '../cache/cache-keys';
import { escapeRegExp } from '../common/utils/escape-regexp';
import { CreateSceneDto } from './dto/create-scene.dto';
import { QueryScenesDto } from './dto/query-scenes.dto';
import { UpdateSceneDto } from './dto/update-scene.dto';
import { Scene, SceneDocument } from './schemas/scene.schema';

export interface PaginatedScenesResult {
  items: ReturnType<ScenesService['toPublicScene']>[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

@Injectable()
export class ScenesService {
  constructor(
    @InjectModel(Scene.name) private readonly sceneModel: Model<Scene>,
    private readonly cache: AppCacheService,
  ) {}

  async create(ownerId: string, dto: CreateSceneDto) {
    const scene = await this.sceneModel.create({
      title: dto.title,
      description: dto.description ?? '',
      ownerId: new Types.ObjectId(ownerId),
      tags: dto.tags ?? [],
      metadata: dto.metadata ?? {},
    });

    return this.toPublicScene(scene);
  }

  async findAllByOwner(ownerId: string, query: QueryScenesDto = {}) {
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;
    const filter = this.buildSceneFilter(ownerId, query);

    const [scenes, total] = await Promise.all([
      this.sceneModel
        .find(filter)
        .sort({ updatedAt: -1 })
        .skip(offset)
        .limit(limit)
        .exec(),
      this.sceneModel.countDocuments(filter).exec(),
    ]);

    return {
      items: scenes.map((scene) => this.toPublicScene(scene)),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + scenes.length < total,
      },
    } satisfies PaginatedScenesResult;
  }

  private buildSceneFilter(
    ownerId: string,
    query: QueryScenesDto,
  ): Record<string, unknown> {
    const filter: Record<string, unknown> = {
      ownerId: new Types.ObjectId(ownerId),
    };

    if (query.search?.trim()) {
      const pattern = new RegExp(escapeRegExp(query.search.trim()), 'i');
      filter.$or = [{ title: pattern }, { tags: pattern }];
    }

    if (
      query.minPrimitiveCount !== undefined ||
      query.maxPrimitiveCount !== undefined
    ) {
      const primitiveCount: Record<string, number> = {};
      if (query.minPrimitiveCount !== undefined) {
        primitiveCount.$gte = query.minPrimitiveCount;
      }
      if (query.maxPrimitiveCount !== undefined) {
        primitiveCount.$lte = query.maxPrimitiveCount;
      }
      filter.primitiveCount = primitiveCount;
    }

    if (query.minDuration !== undefined || query.maxDuration !== undefined) {
      const duration: Record<string, number> = {};
      if (query.minDuration !== undefined) {
        duration.$gte = query.minDuration;
      }
      if (query.maxDuration !== undefined) {
        duration.$lte = query.maxDuration;
      }
      filter['metadata.duration'] = duration;
    }

    if (query.createdAfter || query.createdBefore) {
      const createdAt: Record<string, Date> = {};
      if (query.createdAfter) {
        createdAt.$gte = new Date(query.createdAfter);
      }
      if (query.createdBefore) {
        createdAt.$lte = new Date(query.createdBefore);
      }
      filter.createdAt = createdAt;
    }

    return filter;
  }

  async findByIdForOwner(sceneId: string, ownerId: string) {
    const cacheKey = CacheKeys.scene(ownerId, sceneId);

    return this.cache.getOrSet(
      cacheKey,
      this.cache.getDefaultTtlMs(),
      async () => {
        const scene = await this.findSceneOrThrow(sceneId);
        this.assertOwner(scene, ownerId);
        return this.toPublicScene(scene);
      },
    );
  }

  async update(sceneId: string, ownerId: string, dto: UpdateSceneDto) {
    const scene = await this.findSceneOrThrow(sceneId);
    this.assertOwner(scene, ownerId);

    if (dto.title !== undefined) scene.title = dto.title;
    if (dto.description !== undefined) scene.description = dto.description;
    if (dto.tags !== undefined) scene.tags = dto.tags;
    if (dto.metadata !== undefined) scene.metadata = dto.metadata;

    await scene.save();
    await this.cache.invalidateScene(ownerId, sceneId);
    return this.toPublicScene(scene);
  }

  async remove(sceneId: string, ownerId: string) {
    const scene = await this.findSceneOrThrow(sceneId);
    this.assertOwner(scene, ownerId);

    await scene.deleteOne();
    await this.cache.invalidateScene(ownerId, sceneId);
    return { message: 'Scene deleted successfully' };
  }

  async getOwnedSceneDocument(
    sceneId: string,
    ownerId: string,
  ): Promise<SceneDocument> {
    const scene = await this.findSceneOrThrow(sceneId);
    this.assertOwner(scene, ownerId);
    return scene;
  }

  private async findSceneOrThrow(sceneId: string): Promise<SceneDocument> {
    if (!Types.ObjectId.isValid(sceneId)) {
      throw new NotFoundException('Scene not found');
    }

    const scene = await this.sceneModel.findById(sceneId).exec();
    if (!scene) {
      throw new NotFoundException('Scene not found');
    }

    return scene;
  }

  private assertOwner(scene: SceneDocument, ownerId: string): void {
    if (scene.ownerId.toString() !== ownerId) {
      throw new ForbiddenException('You do not have access to this scene');
    }
  }

  toPublicScene(scene: SceneDocument) {
    return {
      id: scene.id,
      title: scene.title,
      description: scene.description,
      ownerId: scene.ownerId.toString(),
      tags: scene.tags,
      metadata: scene.metadata,
      storageType: scene.storageType,
      primitiveCount: scene.primitiveCount,
      storageSizeBytes: scene.storageSizeBytes,
      createdAt: scene.createdAt,
      updatedAt: scene.updatedAt,
    };
  }
}
