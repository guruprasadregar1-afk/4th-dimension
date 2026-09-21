import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppCacheModule } from './cache/app-cache.module';
import { CacheStatusMiddleware } from './cache/cache-status.middleware';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { AppThrottlerGuard } from './common/guards/app-throttler.guard';
import { AdminModule } from './admin/admin.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { EventsModule } from './events/events.module';
import { HealthModule } from './health/health.module';
import { ImportsModule } from './imports/imports.module';
import { ScenesModule } from './scenes/scenes.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AppCacheModule,
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          name: 'default',
          ttl: config.get<number>('THROTTLE_TTL_MS', 60_000),
          limit: config.get<number>('THROTTLE_LIMIT', 100),
        },
        {
          name: 'auth',
          ttl: config.get<number>('THROTTLE_AUTH_TTL_MS', 60_000),
          limit: config.get<number>('THROTTLE_AUTH_LIMIT', 10),
        },
      ],
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>(
          'MONGODB_URI',
          'mongodb://localhost:27017/4th-dimension',
        ),
      }),
    }),
    AuthModule,
    ScenesModule,
    ImportsModule,
    HealthModule,
    EventsModule,
    AnalyticsModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: AppThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CacheStatusMiddleware).forRoutes('*');
  }
}
