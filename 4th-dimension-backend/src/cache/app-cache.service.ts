import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cache } from 'cache-manager';
import { CacheKeys } from './cache-keys';
import { setCacheStatus } from './cache-status.storage';

@Injectable()
export class AppCacheService {
  constructor(
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly config: ConfigService,
  ) {}

  isEnabled(): boolean {
    return this.config.get<string>('CACHE_ENABLED', 'true') !== 'false';
  }

  getDefaultTtlMs(): number {
    const seconds = this.config.get<number>('CACHE_DEFAULT_TTL_SECONDS', 300);
    return seconds * 1000;
  }

  getPrimitivesTtlMs(): number {
    const seconds = this.config.get<number>(
      'CACHE_PRIMITIVES_TTL_SECONDS',
      3600,
    );
    return seconds * 1000;
  }

  getMaxCacheablePrimitiveBytes(): number {
    const raw = this.config.get<string>('CACHE_MAX_PRIMITIVE_BYTES');
    if (raw) {
      return parseInt(raw, 10);
    }

    const embedded = this.config.get<string>('PRIMITIVE_EMBEDDED_MAX_BYTES');
    if (embedded) {
      return parseInt(embedded, 10);
    }

    return 16 * 1024 * 1024;
  }

  async getOrSet<T>(
    key: string,
    ttlMs: number,
    loader: () => Promise<T>,
    shouldCache: (value: T) => boolean = () => true,
  ): Promise<T> {
    if (!this.isEnabled()) {
      setCacheStatus('BYPASS');
      return loader();
    }

    const cached = await this.cache.get<T>(key);
    if (cached !== undefined && cached !== null) {
      setCacheStatus('HIT');
      return cached;
    }

    const value = await loader();
    if (shouldCache(value)) {
      await this.cache.set(key, value, ttlMs);
    }
    setCacheStatus('MISS');
    return value;
  }

  async invalidateScene(ownerId: string, sceneId: string): Promise<void> {
    await Promise.all([
      this.cache.del(CacheKeys.scene(ownerId, sceneId)),
      this.cache.del(CacheKeys.primitives(ownerId, sceneId)),
    ]);
  }
}
