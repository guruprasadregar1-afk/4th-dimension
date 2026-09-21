import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { GaussianPrimitive, GaussianPrimitiveSchema } from './gaussian-primitive.schema';

export enum SceneStorageType {
  EMBEDDED = 'embedded',
  GRIDFS = 'gridfs',
}

export type SceneDocument = HydratedDocument<Scene>;

@Schema({ timestamps: true })
export class Scene {
  @Prop({ required: true, trim: true, maxlength: 200 })
  title: string;

  @Prop({ default: '', maxlength: 2000 })
  description: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  ownerId: Types.ObjectId;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ type: Object, default: {} })
  metadata: Record<string, unknown>;

  @Prop({ type: [GaussianPrimitiveSchema], default: [] })
  primitives: GaussianPrimitive[];

  @Prop({
    enum: SceneStorageType,
    default: SceneStorageType.EMBEDDED,
  })
  storageType: SceneStorageType;

  @Prop({ type: Types.ObjectId, required: false })
  gridFsFileId?: Types.ObjectId;

  @Prop({ default: 0 })
  primitiveCount: number;

  @Prop({ default: 0 })
  storageSizeBytes: number;

  @Prop({ default: false })
  isFlagged?: boolean;

  @Prop({ type: String, required: false })
  flagReason?: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const SceneSchema = SchemaFactory.createForClass(Scene);

SceneSchema.index({ title: 'text', tags: 'text' });
SceneSchema.index({ ownerId: 1, updatedAt: -1 });
SceneSchema.index({ ownerId: 1, primitiveCount: 1 });
SceneSchema.index({ ownerId: 1, 'metadata.duration': 1 });
