import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsNumber,
  Max,
  Min,
} from 'class-validator';

export class GaussianPrimitiveDto {
  @ApiProperty({ example: [0, 0, 0, 0] })
  @IsArray()
  @ArrayMinSize(4)
  @ArrayMaxSize(4)
  @IsNumber({}, { each: true })
  mean: number[];

  @ApiProperty({ example: Array(16).fill(0.04) })
  @IsArray()
  @ArrayMinSize(16)
  @ArrayMaxSize(16)
  @IsNumber({}, { each: true })
  covariance: number[];

  @ApiProperty({ example: [1, 0, 0, 1] })
  @IsArray()
  @ArrayMinSize(4)
  @ArrayMaxSize(4)
  @IsNumber({}, { each: true })
  color: number[];

  @ApiProperty({ example: 0.9 })
  @IsNumber()
  @Min(0)
  @Max(1)
  alpha: number;
}
