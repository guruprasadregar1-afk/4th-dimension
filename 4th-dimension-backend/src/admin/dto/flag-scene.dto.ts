import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class FlagSceneDto {
  @ApiProperty({ description: 'Flag or unflag scene for moderation' })
  @IsBoolean()
  isFlagged: boolean;

  @ApiPropertyOptional({ description: 'Reason for content moderation flag' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  flagReason?: string;
}
