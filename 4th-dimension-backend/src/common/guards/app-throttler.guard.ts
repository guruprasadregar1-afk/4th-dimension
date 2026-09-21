import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    const user = req.user as { userId?: string } | undefined;
    const ip =
      (req.ip as string | undefined) ??
      (req.ips as string[] | undefined)?.[0] ??
      'unknown';

    if (user?.userId) {
      return `user:${user.userId}`;
    }

    return `ip:${ip}`;
  }

  protected getRequestResponse(context: ExecutionContext) {
    const http = context.switchToHttp();
    return {
      req: http.getRequest<Record<string, unknown>>(),
      res: http.getResponse(),
    };
  }
}
