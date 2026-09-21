import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ _id: false })
export class GaussianPrimitive {
  @Prop({ type: [Number], required: true })
  mean: number[];

  @Prop({ type: [Number], required: true })
  covariance: number[];

  @Prop({ type: [Number], required: true })
  color: number[];

  @Prop({ required: true })
  alpha: number;
}

export const GaussianPrimitiveSchema =
  SchemaFactory.createForClass(GaussianPrimitive);
