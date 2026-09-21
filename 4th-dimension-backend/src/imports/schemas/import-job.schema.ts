import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export enum ImportJobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETE = 'complete',
  FAILED = 'failed',
}

export enum ImportFileFormat {
  NATIVE_JSON = 'native-json',
  THREE_DGS_PLY = '3dgs-ply',
  SPLAT = 'splat',
  FOUR_D_KEYFRAMES_JSON = '4d-keyframes-json',
}

export type ImportJobDocument = HydratedDocument<ImportJob>;

@Schema({ timestamps: true })
export class ImportJob {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  ownerId: Types.ObjectId;

  @Prop({ required: true })
  originalFileName: string;

  @Prop({ required: true })
  mimeType: string;

  @Prop({ required: true })
  fileSizeBytes: number;

  @Prop({ enum: ImportFileFormat, required: true })
  detectedFormat: ImportFileFormat;

  @Prop({ enum: ImportJobStatus, default: ImportJobStatus.PENDING })
  status: ImportJobStatus;

  @Prop({ default: 0, min: 0, max: 100 })
  progress: number;

  @Prop({ default: '' })
  statusMessage: string;

  @Prop({ type: Types.ObjectId, required: false })
  gridFsFileId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Scene', required: false })
  sceneId?: Types.ObjectId;

  @Prop({ default: 0 })
  primitiveCount: number;

  @Prop({ default: '' })
  errorMessage: string;

  @Prop({ type: Object, default: {} })
  metadata: Record<string, unknown>;

  createdAt?: Date;
  updatedAt?: Date;
}

export const ImportJobSchema = SchemaFactory.createForClass(ImportJob);

ImportJobSchema.index({ ownerId: 1, createdAt: -1 });
ImportJobSchema.index({ status: 1 });
