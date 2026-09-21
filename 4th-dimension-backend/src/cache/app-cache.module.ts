import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppCacheService } from './app-cache.service';

@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        ttl: config.get<number>('CACHE_DEFAULT_TTL_SECONDS', 300) * 1000,
        max: config.get<number>('CACHE_MAX_ITEMS', 500),
      }),
    }),
  ],
  providers: [AppCacheService],
  exports: [AppCacheService],
})
export class AppCacheModule {}
