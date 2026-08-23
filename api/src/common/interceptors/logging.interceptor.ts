import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * Logs method, path, status, and duration for every request — the minimum
 * needed to debug a production issue without reaching for a full APM tool.
 *
 * Logs on both the success and error paths. On error, the exception hasn't
 * reached HttpExceptionFilter yet (filters run after interceptors unwind),
 * so `response.statusCode` is still unset here — the status is derived from
 * the exception itself instead, the same way the filter derives it.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const start = Date.now();
    const log = (statusCode: number): void => {
      const duration = Date.now() - start;
      this.logger.log(
        `${request.method} ${request.originalUrl} ${statusCode} +${duration}ms`,
      );
    };

    return next.handle().pipe(
      tap({
        next: () => log(response.statusCode),
        error: (error: unknown) =>
          log(error instanceof HttpException ? error.getStatus() : 500),
      }),
    );
  }
}
