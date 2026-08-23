import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvConfig } from '../../../common/config/env.validation';
import type { SendResult } from './sms.service';

interface ResendSendResponse {
  id?: string;
  message?: string;
  name?: string;
}

/**
 * Thin wrapper around Resend's REST API (docs/16-module-communication.md
 * §1, docs/18-technical-architecture.md §10) — plain `fetch`, same as
 * PaystackService/SmsService, rather than pulling in the `resend` SDK as a
 * new dependency for one endpoint. Single `send(to, subject, html)` method
 * behind which Resend can be swapped for SendGrid/Postmark later.
 *
 * Same non-throwing contract as SmsService, for the same reason — see its
 * class comment.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly apiKey: string;
  private readonly from: string;

  constructor(configService: ConfigService<EnvConfig, true>) {
    this.apiKey = configService.get('RESEND_API_KEY', { infer: true });
    this.from = configService.get('EMAIL_FROM', { infer: true });
  }

  async send(to: string, subject: string, html: string): Promise<SendResult> {
    if (!to) {
      const error = 'No usable email address to send to';
      this.logger.warn(error);
      return { success: false, error };
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ from: this.from, to, subject, html }),
        // See SmsService.send's identical timeout for why this matters —
        // a broadcast fanning out to many recipients (or the absence-alert
        // listener) must never be able to hang on one unresponsive call.
        signal: AbortSignal.timeout(10_000),
      });

      const body = (await response
        .json()
        .catch(() => null)) as ResendSendResponse | null;

      if (!response.ok || !body?.id) {
        const error = `Resend rejected the email: ${body?.message ?? response.statusText}`;
        this.logger.warn(`Email to ${to} failed — ${error}`);
        return { success: false, error };
      }

      this.logger.log(`Email to ${to} sent — Resend id ${body.id}`);
      return { success: true, providerId: body.id };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.name === 'TimeoutError'
            ? 'Resend request timed out after 10s'
            : error.message
          : 'Unknown error';
      this.logger.error(`Email to ${to} failed — request error: ${message}`);
      return { success: false, error: message };
    }
  }
}
