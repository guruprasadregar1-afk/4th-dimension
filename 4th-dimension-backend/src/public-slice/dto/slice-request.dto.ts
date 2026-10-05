import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDefined,
  IsIn,
  IsNumber,
  ValidateNested,
} from 'class-validator';

export class HyperplaneDto {
  @ApiProperty({
    description: '4D normal vector [a, b, c, d]',
    example: [0, 0, 0, 1],
    type: [Number],
  })
  @IsArray({ message: 'hyperplane.normal must be an array' })
  @ArrayMinSize(4, { message: 'hyperplane.normal must contain exactly 4 numbers' })
  @ArrayMaxSize(4, { message: 'hyperplane.normal must contain exactly 4 numbers' })
  @IsNumber({}, { each: true, message: 'Each element in hyperplane.normal must be a number' })
  normal!: [number, number, number, number];

  @ApiProperty({
    description: 'Hyperplane offset distance e (where a*x + b*y + c*z + d*w = e)',
    example: 1.5,
  })
  @IsNumber({}, { message: 'hyperplane.offset must be a number' })
  offset!: number;
}

export class SliceRequestDto {
  @ApiProperty({
    description: 'Target 4D polytope geometry',
    enum: ['tesseract', 'simplex5', 'orthoplex16', 'cell24'],
    example: 'tesseract',
  })
  @IsIn(['tesseract', 'simplex5', 'orthoplex16', 'cell24'], {
    message: 'polytope must be one of: tesseract, simplex5, orthoplex16, cell24',
  })
  polytope!: 'tesseract' | 'simplex5' | 'orthoplex16' | 'cell24';

  @ApiProperty({
    description: '4D Hyperplane definition',
    type: HyperplaneDto,
  })
  @IsDefined({ message: 'hyperplane object is required' })
  @ValidateNested()
  @Type(() => HyperplaneDto)
  hyperplane!: HyperplaneDto;
}
