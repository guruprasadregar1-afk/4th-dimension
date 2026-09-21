import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  AuthUser,
  CurrentUser,
} from '../common/decorators/current-user.decorator';
import { ChangePasswordDto } from './dto/change-password.dto';
import { DeleteAccountDto } from './dto/delete-account.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  getProfile(@CurrentUser() user: AuthUser) {
    return this.usersService.getProfile(user.userId);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  updateProfile(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(user.userId, dto);
  }

  @Patch('me/password')
  @ApiOperation({ summary: 'Change password and invalidate all sessions' })
  changePassword(
    @CurrentUser() user: AuthUser,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(user.userId, dto);
  }

  @Delete('me')
  @ApiOperation({ summary: 'Delete account after password confirmation' })
  deleteAccount(
    @CurrentUser() user: AuthUser,
    @Body() dto: DeleteAccountDto,
  ) {
    return this.usersService.deleteAccount(user.userId, dto);
  }
}
