import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateImportDto {
  @ApiPropertyOptional({ example: 'Imported Hypercube Scene' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ example: 'From 3DGS PLY export' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ type: [String], example: ['import', '3dgs'] })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);
    }
    return value;
  })
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ example: 10, description: 'Scene duration in seconds' })
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === undefined ? undefined : Number(value)))
  @IsNumber()
  @Min(0)
  duration?: number;
}
