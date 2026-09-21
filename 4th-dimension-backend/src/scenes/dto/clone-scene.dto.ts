import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { trimString } from '../../common/transforms/trim-string.transform';

export class CloneSceneDto {
  @ApiPropertyOptional({ example: 'Hypercube Demo (copy)' })
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;
}
