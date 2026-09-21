import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsNumber,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';
import { GaussianPrimitiveDto } from './gaussian-primitive.dto';

export class UploadPrimitivesDto {
  @ApiProperty({ type: [GaussianPrimitiveDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GaussianPrimitiveDto)
  primitives: GaussianPrimitiveDto[];

  @ApiPropertyOptional({ example: 5, description: 'Scene duration in seconds' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  duration?: number;
}
