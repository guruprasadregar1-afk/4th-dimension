import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class DeleteAccountDto {
  @ApiProperty({
    description: 'Current password to confirm account deletion',
    example: 'SecurePass123!',
  })
  @IsString()
  @MinLength(8)
  password: string;
}
