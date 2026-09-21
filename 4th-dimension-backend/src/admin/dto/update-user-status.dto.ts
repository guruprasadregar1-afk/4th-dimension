import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateUserStatusDto {
  @ApiProperty({ description: 'Set user account suspension state' })
  @IsBoolean()
  isSuspended: boolean;
}
