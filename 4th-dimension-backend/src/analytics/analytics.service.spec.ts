import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { AnalyticsService } from './analytics.service';
import { Scene } from '../scenes/schemas/scene.schema';
import { User } from '../users/schemas/user.schema';
import { SceneGateway } from '../events/scene.gateway';

describe('AnalyticsService', () => {
  let service: AnalyticsService;

  const mockSceneModel = {
    countDocuments: jest.fn().mockResolvedValue(10),
    aggregate: jest.fn().mockResolvedValue([
      { totalPrimitives: 50000, totalStorageBytes: 1048576, avgPrimitiveCount: 5000 },
    ]),
    findById: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        _id: 'scene-123',
        title: 'Test 4D Scene',
        ownerId: 'owner-1',
        primitiveCount: 15000,
        storageSizeBytes: 500000,
        storageType: 'embedded',
        metadata: { duration: 10 },
        isFlagged: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    }),
  };

  const mockUserModel = {
    countDocuments: jest.fn().mockResolvedValue(5),
  };

  const mockGateway = {
    getTotalActiveConnections: jest.fn().mockReturnValue(3),
    getActiveViewerCount: jest.fn().mockReturnValue(2),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: getModelToken(Scene.name), useValue: mockSceneModel },
        { provide: getModelToken(User.name), useValue: mockUserModel },
        { provide: SceneGateway, useValue: mockGateway },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
  });

  it('calculates platform overview metrics', async () => {
    const res = await service.getOverviewMetrics();

    expect(res.totalUsers).toBe(5);
    expect(res.totalScenes).toBe(10);
    expect(res.totalPrimitives).toBe(50000);
    expect(res.activeRealtimeConnections).toBe(3);
  });

  it('returns metrics for a specific scene', async () => {
    const res = await service.getSceneMetrics('507f1f77bcf86cd799439011');

    expect(res.title).toBe('Test 4D Scene');
    expect(res.activeViewers).toBe(2);
    expect(res.complexityGrade).toBe('LOW');
  });
});
