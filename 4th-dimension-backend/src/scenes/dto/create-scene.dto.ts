import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { trimString } from '../../common/transforms/trim-string.transform';

export class CreateSceneDto {
  @ApiProperty({ example: 'Hypercube Rotation Demo' })
  @Transform(trimString)
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({ example: 'A 4D hypercube projected into 3D space' })
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ example: ['demo', '4d', 'hypercube'] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  tags?: string[];

  @ApiPropertyOptional({
    example: { duration: 5, primitiveCount: 0 },
    description: 'Flexible metadata for 4D scene configuration',
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
