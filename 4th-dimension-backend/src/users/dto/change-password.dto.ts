import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ example: 'CurrentPass123!' })
  @IsString()
  @MinLength(8)
  currentPassword: string;

  @ApiProperty({ example: 'NewSecurePass456!', minLength: 8 })
  @IsString()
  @MinLength(8)
  newPassword: string;
}
