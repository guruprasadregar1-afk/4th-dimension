import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppCacheModule } from '../cache/app-cache.module';
import { Scene, SceneSchema } from './schemas/scene.schema';
import { PrimitivesService } from './primitives.service';
import { ScenesController } from './scenes.controller';
import { ScenesService } from './scenes.service';

@Module({
  imports: [
    AppCacheModule,
    MongooseModule.forFeature([{ name: Scene.name, schema: SceneSchema }]),
  ],
  controllers: [ScenesController],
  providers: [ScenesService, PrimitivesService],
  exports: [ScenesService, PrimitivesService],
})
export class ScenesModule {}
