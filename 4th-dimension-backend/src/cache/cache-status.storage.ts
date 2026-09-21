import { AsyncLocalStorage } from 'async_hooks';

export type CacheStatus = 'HIT' | 'MISS' | 'BYPASS';

export const cacheStatusStorage = new AsyncLocalStorage<{ status: CacheStatus }>();

export function setCacheStatus(status: CacheStatus): void {
  const store = cacheStatusStorage.getStore();
  if (store) {
    store.status = status;
  }
}
