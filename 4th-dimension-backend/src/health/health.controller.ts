import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectConnection } from '@nestjs/mongoose';
import { SkipThrottle } from '@nestjs/throttler';
import { Connection } from 'mongoose';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('health')
@Controller('health')
@Public()
@SkipThrottle()
export class HealthController {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  @Get()
  @ApiOperation({ summary: 'Health check with MongoDB connection status' })
  getHealth() {
    const dbState = this.connection.readyState;
    const dbStatusMap: Record<number, string> = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting',
    };

    return {
      status: 'ok',
      database: dbStatusMap[dbState] ?? 'unknown',
    };
  }
}
