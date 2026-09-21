import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Scene, SceneSchema } from '../scenes/schemas/scene.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { EventsModule } from '../events/events.module';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Scene.name, schema: SceneSchema },
      { name: User.name, schema: UserSchema },
    ]),
    EventsModule,
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
