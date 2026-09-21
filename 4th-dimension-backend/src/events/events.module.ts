import { Module } from '@nestjs/common';
import { SceneGateway } from './scene.gateway';

@Module({
  providers: [SceneGateway],
  exports: [SceneGateway],
})
export class EventsModule {}
