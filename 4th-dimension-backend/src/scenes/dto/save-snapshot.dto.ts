import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export class SaveSnapshotDto {
  @ApiProperty({ description: 'Simulation time timestamp' })
  @IsNumber()
  time: number;

  @ApiPropertyOptional({ description: 'Optional snapshot title or label' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  label?: string;

  @ApiPropertyOptional({ description: 'Hyperplane rotation matrix angles' })
  @IsOptional()
  hyperplaneAngles?: Record<string, number>;

  @ApiPropertyOptional({ description: 'XPBD physics solver state parameters' })
  @IsOptional()
  physicsState?: Record<string, unknown>;
}
