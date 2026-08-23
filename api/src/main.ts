import * as Sentry from '@sentry/node';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import type { EnvConfig } from './common/config/env.validation';

// Initialized before the Nest app boots (Sentry's own docs convention) so
// any error during module instantiation is captured too, not just ones
// thrown after the server is already listening. process.env read directly
// here (not via ConfigService) since Sentry.init must run before Nest's DI
// container exists to provide one. A missing/empty SENTRY_DSN makes every
// Sentry.* call below a safe no-op — see env.validation.ts's comment.
Sentry.init({
  dsn: process.env.SENTRY_DSN || undefined,
  environment: process.env.NODE_ENV ?? 'development',
});

async function bootstrap(): Promise<void> {
  // rawBody: true preserves the unparsed request buffer alongside the
  // parsed JSON body (as req.rawBody) — the Paystack webhook needs the
  // exact bytes Paystack signed, not a re-serialized copy of the parsed
  // object, to verify x-paystack-signature correctly.
  const app = await NestFactory.create(AppModule, { rawBody: true });
  const config = app.get(ConfigService<EnvConfig, true>);

  app.enableCors({
    origin: config.get('FRONTEND_ORIGIN', { infer: true }),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('School Management System API')
    .setDescription(
      'Backend API for the single-school School Management System. See /docs in the repo root for the full functional spec.',
    )
    .setVersion('0.1')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = config.get('PORT', { infer: true });
  await app.listen(port);
  Logger.log(`Server running on http://localhost:${port}`, 'Bootstrap');
  Logger.log(`Swagger docs at http://localhost:${port}/api/docs`, 'Bootstrap');
}

bootstrap().catch((error: unknown) => {
  Sentry.captureException(error);
  Logger.error(
    'Failed to start application',
    error instanceof Error ? error.stack : String(error),
    'Bootstrap',
  );
  // Sentry delivers asynchronously — without flushing first, process.exit()
  // below would very likely kill the process before the event leaves the
  // process, silently dropping the one error report that matters most
  // (the app never started at all).
  void Sentry.close(2000).finally(() => process.exit(1));
});
