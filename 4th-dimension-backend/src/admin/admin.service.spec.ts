import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { AdminService } from './admin.service';
import { Scene } from '../scenes/schemas/scene.schema';
import { User } from '../users/schemas/user.schema';

describe('AdminService', () => {
  let service: AdminService;

  const mockUser = {
    _id: '507f1f77bcf86cd799439011',
    email: 'user@example.com',
    role: 'user',
    isSuspended: false,
  };

  const mockScene = {
    _id: '507f1f77bcf86cd799439012',
    title: 'Flagged Scene',
    isFlagged: true,
    flagReason: 'Inappropriate content',
  };

  const mockUserModel = {
    find: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([mockUser]),
    }),
    countDocuments: jest.fn().mockResolvedValue(1),
    findByIdAndUpdate: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue({ ...mockUser, isSuspended: true }),
    }),
  };

  const mockSceneModel = {
    find: jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([mockScene]),
    }),
    countDocuments: jest.fn().mockResolvedValue(1),
    findByIdAndUpdate: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue({ ...mockScene, isFlagged: true }),
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: getModelToken(User.name), useValue: mockUserModel },
        { provide: getModelToken(Scene.name), useValue: mockSceneModel },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  it('lists users with pagination', async () => {
    const res = await service.listUsers(1, 10);
    expect(res.users).toHaveLength(1);
    expect(res.pagination.total).toBe(1);
  });

  it('updates user suspension status', async () => {
    const res = await service.updateUserStatus('507f1f77bcf86cd799439011', { isSuspended: true });
    expect(res.isSuspended).toBe(true);
  });

  it('flags a scene for moderation', async () => {
    const res = await service.flagScene('507f1f77bcf86cd799439012', { isFlagged: true, flagReason: 'Spam' });
    expect(res.isFlagged).toBe(true);
  });
});
