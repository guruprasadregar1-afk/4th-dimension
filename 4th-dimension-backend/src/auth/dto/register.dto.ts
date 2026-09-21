import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { trimString } from '../../common/transforms/trim-string.transform';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @Transform(trimString)
  @IsEmail()
  @MaxLength(320)
  email: string;

  @ApiProperty({ example: 'SecurePass123!', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;
}
