import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { GridFSBucket, ObjectId } from 'mongodb';
import { Connection, Model, Types } from 'mongoose';
import { AppCacheService } from '../cache/app-cache.service';
import { CacheKeys } from '../cache/cache-keys';
import { UploadPrimitivesDto } from './dto/upload-primitives.dto';
import { GaussianPrimitive } from './schemas/gaussian-primitive.schema';
import {
  Scene,
  SceneDocument,
  SceneStorageType,
} from './schemas/scene.schema';
import { ScenesService } from './scenes.service';

const GRIDFS_BUCKET = 'scene_primitives';
const DEFAULT_MAX_EMBEDDED_BYTES = 16 * 1024 * 1024;

interface StoredPrimitivesPayload {
  primitives: GaussianPrimitive[];
  duration?: number;
}

@Injectable()
export class PrimitivesService {
  constructor(
    @InjectModel(Scene.name) private readonly sceneModel: Model<Scene>,
    @InjectConnection() private readonly connection: Connection,
    private readonly config: ConfigService,
    private readonly scenesService: ScenesService,
    private readonly cache: AppCacheService,
  ) {}

  async upload(sceneId: string, ownerId: string, dto: UploadPrimitivesDto) {
    const scene = await this.scenesService.getOwnedSceneDocument(
      sceneId,
      ownerId,
    );

    const payload: StoredPrimitivesPayload = {
      primitives: dto.primitives,
      duration: dto.duration,
    };
    const serialized = Buffer.from(JSON.stringify(payload), 'utf-8');
    const maxEmbeddedBytes = this.getMaxEmbeddedBytes();

    if (serialized.byteLength <= maxEmbeddedBytes) {
      await this.storeEmbedded(scene, dto, serialized.byteLength);
    } else {
      await this.storeGridFs(scene, payload, serialized);
    }

    await this.cache.invalidateScene(ownerId, sceneId);

    return this.scenesService.toPublicScene(
      (await this.sceneModel.findById(scene.id).exec()) as SceneDocument,
    );
  }

  async fetch(sceneId: string, ownerId: string) {
    const cacheKey = CacheKeys.primitives(ownerId, sceneId);
    const maxCacheableBytes = this.cache.getMaxCacheablePrimitiveBytes();

    return this.cache.getOrSet(
      cacheKey,
      this.cache.getPrimitivesTtlMs(),
      async () => {
        const scene = await this.scenesService.getOwnedSceneDocument(
          sceneId,
          ownerId,
        );

        const payload = await this.loadPayload(scene);

        return {
          id: scene.id,
          title: scene.title,
          duration:
            payload.duration ??
            (scene.metadata?.duration as number | undefined) ??
            0,
          primitives: payload.primitives,
          storageSizeBytes: scene.storageSizeBytes ?? 0,
        };
      },
      (value) => value.storageSizeBytes <= maxCacheableBytes,
    ).then(({ storageSizeBytes: _size, ...response }) => response);
  }

  async deleteStorageForScene(scene: SceneDocument): Promise<void> {
    if (
      scene.storageType === SceneStorageType.GRIDFS &&
      scene.gridFsFileId
    ) {
      await this.deleteGridFsFile(scene.gridFsFileId);
    }
  }

  private async storeEmbedded(
    scene: SceneDocument,
    dto: UploadPrimitivesDto,
    sizeBytes: number,
  ): Promise<void> {
    if (
      scene.storageType === SceneStorageType.GRIDFS &&
      scene.gridFsFileId
    ) {
      await this.deleteGridFsFile(scene.gridFsFileId);
    }

    scene.primitives = dto.primitives;
    scene.storageType = SceneStorageType.EMBEDDED;
    scene.gridFsFileId = undefined;
    scene.primitiveCount = dto.primitives.length;
    scene.storageSizeBytes = sizeBytes;

    if (dto.duration !== undefined) {
      scene.metadata = { ...scene.metadata, duration: dto.duration };
    }

    await scene.save();
  }

  private async storeGridFs(
    scene: SceneDocument,
    payload: StoredPrimitivesPayload,
    serialized: Buffer,
  ): Promise<void> {
    if (
      scene.storageType === SceneStorageType.GRIDFS &&
      scene.gridFsFileId
    ) {
      await this.deleteGridFsFile(scene.gridFsFileId);
    }

    const bucket = this.getBucket();
    const uploadStream = bucket.openUploadStream(`${scene.id}.json`, {
      metadata: { sceneId: scene.id },
      contentType: 'application/json',
    });

    await new Promise<void>((resolve, reject) => {
      uploadStream.on('error', reject);
      uploadStream.on('finish', () => resolve());
      uploadStream.end(serialized);
    });

    scene.primitives = [];
    scene.storageType = SceneStorageType.GRIDFS;
    scene.gridFsFileId = new Types.ObjectId(uploadStream.id.toString());
    scene.primitiveCount = payload.primitives.length;
    scene.storageSizeBytes = serialized.byteLength;

    if (payload.duration !== undefined) {
      scene.metadata = { ...scene.metadata, duration: payload.duration };
    }

    await scene.save();
  }

  private async loadPayload(scene: SceneDocument): Promise<StoredPrimitivesPayload> {
    if (scene.storageType === SceneStorageType.EMBEDDED) {
      return {
        primitives: scene.primitives ?? [],
        duration: scene.metadata?.duration as number | undefined,
      };
    }

    if (!scene.gridFsFileId) {
      throw new NotFoundException('GridFS file not found for scene');
    }

    const bucket = this.getBucket();
    const chunks: Buffer[] = [];

    const downloadStream = bucket.openDownloadStream(
      new ObjectId(scene.gridFsFileId.toString()),
    );

    await new Promise<void>((resolve, reject) => {
      downloadStream.on('data', (chunk: Buffer) => chunks.push(chunk));
      downloadStream.on('error', reject);
      downloadStream.on('end', resolve);
    });

    return JSON.parse(Buffer.concat(chunks).toString('utf-8'));
  }

  private getBucket(): GridFSBucket {
    const db = this.connection.db;
    if (!db) {
      throw new Error('MongoDB connection is not ready');
    }

    return new GridFSBucket(db, { bucketName: GRIDFS_BUCKET });
  }

  private async deleteGridFsFile(fileId: Types.ObjectId): Promise<void> {
    const bucket = this.getBucket();
    await bucket.delete(new ObjectId(fileId.toString()));
  }

  private getMaxEmbeddedBytes(): number {
    const raw = this.config.get<string>('PRIMITIVE_EMBEDDED_MAX_BYTES');
    if (raw) {
      return parseInt(raw, 10);
    }
    return DEFAULT_MAX_EMBEDDED_BYTES;
  }
}
