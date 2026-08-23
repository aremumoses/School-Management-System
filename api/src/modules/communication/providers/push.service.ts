import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import webpush from 'web-push';
import type { EnvConfig } from '../../../common/config/env.validation';
import type { SendResult } from './sms.service';

export interface WebPushSubscriptionJson {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

/**
 * Thin wrapper around the `web-push` package (docs/18-technical-architecture.md
 * §10, Stage 28) — VAPID keys are self-generated (see .env.example), not
 * tied to any external BSP account, so unlike SmsService/EmailService/
 * WhatsAppProviderService this one can genuinely deliver in this
 * environment, not just record a placeholder failure.
 *
 * `410 Gone` / `404 Not Found` from the push service means the browser
 * unsubscribed or the endpoint expired — the caller (BroadcastsService)
 * deletes the stale PushSubscription row on that specific signal so it
 * doesn't keep retrying a dead endpoint forever.
 */
@Injectable()
export class PushProviderService {
  private readonly logger = new Logger(PushProviderService.name);

  constructor(configService: ConfigService<EnvConfig, true>) {
    webpush.setVapidDetails(
      configService.get('VAPID_SUBJECT', { infer: true }),
      configService.get('VAPID_PUBLIC_KEY', { infer: true }),
      configService.get('VAPID_PRIVATE_KEY', { infer: true }),
    );
  }

  async send(
    subscription: WebPushSubscriptionJson,
    payload: PushPayload,
  ): Promise<SendResult & { gone?: boolean }> {
    try {
      await webpush.sendNotification(subscription, JSON.stringify(payload));
      this.logger.log(
        `Push sent to endpoint ending …${subscription.endpoint.slice(-12)}`,
      );
      return { success: true };
    } catch (error) {
      const statusCode =
        error && typeof error === 'object' && 'statusCode' in error
          ? (error as { statusCode: number }).statusCode
          : undefined;
      const gone = statusCode === 404 || statusCode === 410;
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(
        `Push to endpoint ending …${subscription.endpoint.slice(-12)} failed (${statusCode ?? 'no status'}): ${message}`,
      );
      return { success: false, error: message, gone };
    }
  }
}
