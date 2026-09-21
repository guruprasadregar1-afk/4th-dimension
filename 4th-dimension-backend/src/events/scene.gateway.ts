import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

export interface TimeScrubPayload {
  sceneId: string;
  time: number;
  hyperplaneAngles?: {
    xy?: number;
    xz?: number;
    yz?: number;
    xw?: number;
    yw?: number;
    zw?: number;
  };
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/scenes',
})
export class SceneGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(SceneGateway.name);
  private roomViewers: Map<string, Set<string>> = new Map();

  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    for (const [sceneId, viewers] of this.roomViewers.entries()) {
      if (viewers.has(client.id)) {
        viewers.delete(client.id);
        this.broadcastViewerCount(sceneId);
      }
    }
  }

  @SubscribeMessage('joinScene')
  handleJoinScene(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sceneId: string },
  ) {
    const { sceneId } = data;
    if (!sceneId) return;

    client.join(sceneId);
    let viewers = this.roomViewers.get(sceneId);
    if (!viewers) {
      viewers = new Set();
      this.roomViewers.set(sceneId, viewers);
    }
    viewers.add(client.id);

    this.logger.log(`Client ${client.id} joined scene room: ${sceneId}`);
    this.broadcastViewerCount(sceneId);

    return { event: 'joinedScene', sceneId, activeViewers: viewers.size };
  }

  @SubscribeMessage('leaveScene')
  handleLeaveScene(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sceneId: string },
  ) {
    const { sceneId } = data;
    if (!sceneId) return;

    client.leave(sceneId);
    const viewers = this.roomViewers.get(sceneId);
    if (viewers) {
      viewers.delete(client.id);
      this.broadcastViewerCount(sceneId);
    }

    this.logger.log(`Client ${client.id} left scene room: ${sceneId}`);
    return { event: 'leftScene', sceneId };
  }

  @SubscribeMessage('timeScrub')
  handleTimeScrub(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: TimeScrubPayload,
  ) {
    if (!payload.sceneId) return;

    client.to(payload.sceneId).emit('timeScrubbed', {
      senderId: client.id,
      time: payload.time,
      hyperplaneAngles: payload.hyperplaneAngles,
    });
  }

  emitImportJobStatus(jobId: string, status: string, result?: any) {
    if (this.server) {
      this.server.emit('importJobUpdated', { jobId, status, result });
    }
  }

  private broadcastViewerCount(sceneId: string) {
    const count = this.roomViewers.get(sceneId)?.size || 0;
    if (this.server) {
      this.server.to(sceneId).emit('viewerCountUpdated', { sceneId, activeViewers: count });
    }
  }

  getActiveViewerCount(sceneId: string): number {
    return this.roomViewers.get(sceneId)?.size || 0;
  }

  getTotalActiveConnections(): number {
    let total = 0;
    for (const viewers of this.roomViewers.values()) {
      total += viewers.size;
    }
    return total;
  }
}
