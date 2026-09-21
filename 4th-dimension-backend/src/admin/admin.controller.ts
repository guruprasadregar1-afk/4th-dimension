import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from '../users/schemas/user.schema';
import { Roles } from './decorators/roles.decorator';
import { RolesGuard } from './guards/roles.guard';
import { AdminService } from './admin.service';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { FlagSceneDto } from './dto/flag-scene.dto';

@ApiTags('Admin')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@UseGuards(RolesGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  @ApiOperation({ summary: 'Admin list all users with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Paginated user list returned' })
  @ApiResponse({ status: 403, description: 'Forbidden - requires ADMIN role' })
  listUsers(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminService.listUsers(
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
  }

  @Patch('users/:id/status')
  @ApiOperation({ summary: 'Admin update user suspension status' })
  @ApiResponse({ status: 200, description: 'User status updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - requires ADMIN role' })
  updateUserStatus(
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.adminService.updateUserStatus(id, dto);
  }

  @Get('scenes/flagged')
  @ApiOperation({ summary: 'Admin list flagged scenes' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  listFlaggedScenes(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminService.listFlaggedScenes(
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
  }

  @Patch('scenes/:id/flag')
  @ApiOperation({ summary: 'Admin flag or unflag a scene for moderation' })
  @ApiResponse({ status: 200, description: 'Scene flag status updated' })
  @ApiResponse({ status: 403, description: 'Forbidden - requires ADMIN role' })
  flagScene(
    @Param('id') id: string,
    @Body() dto: FlagSceneDto,
  ) {
    return this.adminService.flagScene(id, dto);
  }
}
