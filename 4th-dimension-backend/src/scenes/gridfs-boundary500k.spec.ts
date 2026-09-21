import { Test, TestingModule } from '@nestjs/testing';
import { PrimitivesService } from './primitives.service';
import { getModelToken, getConnectionToken } from '@nestjs/mongoose';
import { Scene } from './schemas/scene.schema';
import { ConfigService } from '@nestjs/config';
import { ScenesService } from './scenes.service';
import { AppCacheService } from '../cache/app-cache.service';
import { Types } from 'mongoose';

describe('GridFS 500,000 Primitive Boundary Test (B6.2 & Item 7)', () => {
  let service: PrimitivesService;

  const mockSceneId = new Types.ObjectId().toString();
  const mockUserId = new Types.ObjectId().toString();

  const mockSceneDoc = {
    _id: mockSceneId,
    ownerId: mockUserId,
    storageType: 'embedded',
    primitiveCount: 0,
    storageSizeBytes: 0,
    gridFsFileId: null,
    primitives: [],
    save: jest.fn().mockImplementation(function (this: any) {
      return Promise.resolve(this);
    }),
  };

  const mockSceneModel = {
    findById: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockSceneDoc),
    }),
  };

  const mockConnection = {
    db: {
      collection: jest.fn().mockReturnValue({
        insertOne: jest.fn().mockResolvedValue({}),
        createIndex: jest.fn().mockResolvedValue({}),
      }),
    },
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue(16 * 1024 * 1024),
  };

  const mockScenesService = {
    getOwnedSceneDocument: jest.fn().mockResolvedValue(mockSceneDoc),
    toPublicScene: jest.fn().mockImplementation((s: any) => s),
  };

  const mockCacheService = {
    invalidateScene: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrimitivesService,
        { provide: getModelToken(Scene.name), useValue: mockSceneModel },
        { provide: getConnectionToken(), useValue: mockConnection },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: ScenesService, useValue: mockScenesService },
        { provide: AppCacheService, useValue: mockCacheService },
      ],
    }).compile();

    service = module.get<PrimitivesService>(PrimitivesService);
    
    // Mock storeGridFs to avoid raw stream piping in Jest unit sandbox
    jest.spyOn(service as any, 'storeGridFs').mockImplementation(async (scene: any, payload: any, size: number) => {
      scene.storageType = 'gridfs';
      scene.gridFsFileId = new Types.ObjectId();
      scene.primitives = [];
      scene.primitiveCount = payload.primitives.length;
      scene.storageSizeBytes = size;
      await scene.save();
      return { fileId: scene.gridFsFileId, size };
    });
  });

  it('engages GridFS chunking when primitive payload exceeds 16MB boundary', async () => {
    console.log('\n--- BACKEND 500,000 PRIMITIVE GRIDFS BOUNDARY TEST ---');
    const count = 500_000;
    const primitives = new Array(count).fill({
      mean: [1.2, 3.4, 5.6, 0.1],
      covariance: [0.02, 0, 0, 0, 0, 0.02, 0, 0, 0, 0, 0.02, 0, 0, 0, 0, 0.05],
      color: [1, 0, 0, 1],
      alpha: 0.8,
    });

    const jsonSize = JSON.stringify(primitives).length;
    console.log(`- Primitive Count: ${count}`);
    console.log(`- Serialized JSON Payload Size: ${(jsonSize / (1024 * 1024)).toFixed(2)} MB`);
    expect(jsonSize).toBeGreaterThan(16 * 1024 * 1024);

    const result = await service.upload(mockSceneId, mockUserId, {
      duration: 10,
      primitives,
    });

    console.log(`- Storage Strategy Selected: ${mockSceneDoc.storageType.toUpperCase()}`);
    console.log(`- GridFS Bucket Engage Confirmed: ${mockSceneDoc.storageType === 'gridfs'}`);

    expect(mockSceneDoc.storageType).toBe('gridfs');
    expect(mockSceneDoc.primitiveCount).toBe(500_000);
  }, 15000);
});
