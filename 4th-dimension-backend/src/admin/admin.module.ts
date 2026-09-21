import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Scene, SceneSchema } from '../scenes/schemas/scene.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Scene.name, schema: SceneSchema },
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
