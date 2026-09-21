import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { ScenesService } from './scenes.service';
import { Scene } from './schemas/scene.schema';

import { AppCacheService } from '../cache/app-cache.service';

describe('ScenesService', () => {
  let service: ScenesService;

  const ownerId = new Types.ObjectId().toString();
  const otherUserId = new Types.ObjectId().toString();
  const sceneId = new Types.ObjectId();

  const mockAppCacheService = {
    invalidateScene: jest.fn().mockResolvedValue(undefined),
    getDefaultTtlMs: jest.fn().mockReturnValue(60000),
    getOrSet: jest.fn().mockImplementation((key, ttl, cb) => cb()),
  };

  const mockScene = {
    _id: sceneId,
    id: sceneId.toString(),
    title: 'Test Scene',
    description: 'Desc',
    ownerId: new Types.ObjectId(ownerId),
    tags: ['demo'],
    metadata: { duration: 5 },
    createdAt: new Date(),
    updatedAt: new Date(),
    save: jest.fn().mockResolvedValue(true),
    deleteOne: jest.fn().mockResolvedValue(true),
  };

  const mockFindChain = {
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue([mockScene]),
  };

  const mockSceneModel = {
    create: jest.fn().mockResolvedValue(mockScene),
    find: jest.fn().mockReturnValue(mockFindChain),
    countDocuments: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(1),
    }),
    findById: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockScene),
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScenesService,
        { provide: getModelToken(Scene.name), useValue: mockSceneModel },
        { provide: AppCacheService, useValue: mockAppCacheService },
      ],
    }).compile();

    service = module.get<ScenesService>(ScenesService);
    jest.clearAllMocks();
    mockSceneModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockScene),
    });
    mockScene.ownerId = new Types.ObjectId(ownerId);
  });

  it('creates a scene for the given owner', async () => {
    const result = await service.create(ownerId, {
      title: 'New Scene',
      tags: ['4d'],
    });

    expect(mockSceneModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'New Scene',
        ownerId: expect.any(Types.ObjectId),
      }),
    );
    expect(result.ownerId).toBe(ownerId);
  });

  it('throws ForbiddenException when non-owner updates', async () => {
    await expect(
      service.update(sceneId.toString(), otherUserId, { title: 'Hack' }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('throws NotFoundException for invalid scene id', async () => {
    await expect(
      service.findByIdForOwner('invalid-id', ownerId),
    ).rejects.toThrow(NotFoundException);
  });

  it('deletes scene when owner matches', async () => {
    const result = await service.remove(sceneId.toString(), ownerId);

    expect(mockScene.deleteOne).toHaveBeenCalled();
    expect(result.message).toContain('deleted');
  });
});
