import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { cacheStatusStorage } from './cache-status.storage';

@Injectable()
export class CacheStatusMiddleware implements NestMiddleware {
  use(_req: Request, _res: Response, next: NextFunction): void {
    cacheStatusStorage.run({ status: 'BYPASS' }, () => next());
  }
}
