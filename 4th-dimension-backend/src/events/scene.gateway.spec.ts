import { Test, TestingModule } from '@nestjs/testing';
import { SceneGateway } from './scene.gateway';

describe('SceneGateway', () => {
  let gateway: SceneGateway;

  const mockSocket = {
    id: 'socket-123',
    join: jest.fn(),
    leave: jest.fn(),
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
  } as any;

  const mockServer = {
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SceneGateway],
    }).compile();

    gateway = module.get<SceneGateway>(SceneGateway);
    gateway.server = mockServer;
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  it('handles client join scene room', () => {
    const res = gateway.handleJoinScene(mockSocket, { sceneId: 'scene-1' });

    expect(mockSocket.join).toHaveBeenCalledWith('scene-1');
    expect(res).toEqual({ event: 'joinedScene', sceneId: 'scene-1', activeViewers: 1 });
    expect(gateway.getActiveViewerCount('scene-1')).toBe(1);
  });

  it('handles client leave scene room', () => {
    gateway.handleJoinScene(mockSocket, { sceneId: 'scene-1' });
    const res = gateway.handleLeaveScene(mockSocket, { sceneId: 'scene-1' });

    expect(mockSocket.leave).toHaveBeenCalledWith('scene-1');
    expect(res).toEqual({ event: 'leftScene', sceneId: 'scene-1' });
    expect(gateway.getActiveViewerCount('scene-1')).toBe(0);
  });

  it('handles time scrubbing broadcast', () => {
    gateway.handleTimeScrub(mockSocket, { sceneId: 'scene-1', time: 2.5 });

    expect(mockSocket.to).toHaveBeenCalledWith('scene-1');
    expect(mockSocket.emit).toHaveBeenCalledWith(
      'timeScrubbed',
      expect.objectContaining({ time: 2.5 }),
    );
  });
});
