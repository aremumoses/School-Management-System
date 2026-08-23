import * as Sentry from '@sentry/node';
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import type { RequestUser } from '../types/auth.types';

interface ErrorResponseBody {
  statusCode: number;
  message: string | string[];
  error: string;
}

interface RequestWithOptionalUser extends Request {
  user?: RequestUser;
}

/**
 * Normalizes every thrown error (HttpException or otherwise) into one
 * consistent JSON shape, instead of leaking Nest's default error format
 * (which differs between validation errors, thrown HttpExceptions, and
 * uncaught exceptions).
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<RequestWithOptionalUser>();

    const isHttpException = exception instanceof HttpException;
    const statusCode = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse = isHttpException ? exception.getResponse() : null;

    const body: ErrorResponseBody =
      exceptionResponse && typeof exceptionResponse === 'object'
        ? {
            statusCode,
            message: (exceptionResponse as Record<string, unknown>).message as
              | string
              | string[],
            error:
              ((exceptionResponse as Record<string, unknown>)
                .error as string) ?? HttpStatus[statusCode],
          }
        : {
            statusCode,
            message: isHttpException
              ? exception.message
              : 'Internal server error',
            error: HttpStatus[statusCode] ?? 'Internal Server Error',
          };

    if (statusCode >= 500) {
      this.logger.error(
        `${request.method} ${request.url} -> ${statusCode}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
      // Only the caller's role/userType as context, never name/email —
      // Stage 11 hardening explicitly wants role attached without leaking
      // PII into a third-party error-tracking service.
      Sentry.withScope((scope) => {
        if (request.user) {
          scope.setTag('userType', request.user.userType);
          scope.setTag('roles', request.user.roles.join(','));
        }
        scope.setContext('request', {
          method: request.method,
          url: request.url,
        });
        Sentry.captureException(exception);
      });
    }

    response.status(statusCode).json(body);
  }
}
