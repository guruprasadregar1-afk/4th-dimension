import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { cacheStatusStorage } from './cache-status.storage';

@Injectable()
export class CacheHeaderInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse();
        const store = cacheStatusStorage.getStore();
        if (store && !response.headersSent) {
          response.setHeader('X-Cache', store.status);
        }
      }),
    );
  }
}
