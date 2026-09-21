import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { trimString } from '../../common/transforms/trim-string.transform';

export class QueryScenesDto {
  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ default: 0, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;

  @ApiPropertyOptional({ description: 'Search title or tags (case-insensitive substring)' })
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ description: 'Minimum primitive count (inclusive)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minPrimitiveCount?: number;

  @ApiPropertyOptional({ description: 'Maximum primitive count (inclusive)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxPrimitiveCount?: number;

  @ApiPropertyOptional({ description: 'Minimum scene duration in seconds (metadata.duration)' })
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  minDuration?: number;

  @ApiPropertyOptional({ description: 'Maximum scene duration in seconds (metadata.duration)' })
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  maxDuration?: number;

  @ApiPropertyOptional({ description: 'ISO date — scenes created on or after' })
  @IsOptional()
  @IsDateString()
  createdAfter?: string;

  @ApiPropertyOptional({ description: 'ISO date — scenes created on or before' })
  @IsOptional()
  @IsDateString()
  createdBefore?: string;
}
