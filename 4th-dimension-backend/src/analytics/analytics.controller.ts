import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';

@ApiTags('Analytics')
@ApiBearerAuth()
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Get system-wide platform metrics' })
  @ApiResponse({ status: 200, description: 'Summary analytics returned successfully' })
  getOverview() {
    return this.analyticsService.getOverviewMetrics();
  }

  @Get('scenes/:id')
  @ApiOperation({ summary: 'Get analytics metrics for a specific 4D scene' })
  @ApiResponse({ status: 200, description: 'Scene metrics returned successfully' })
  @ApiResponse({ status: 404, description: 'Scene not found' })
  getSceneMetrics(@Param('id') id: string) {
    return this.analyticsService.getSceneMetrics(id);
  }
}
