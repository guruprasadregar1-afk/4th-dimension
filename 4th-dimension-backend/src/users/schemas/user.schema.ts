import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class User {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true })
  hashedPassword: string;

  @Prop({ required: true, enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @Prop({ default: false })
  isSuspended?: boolean;

  createdAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
