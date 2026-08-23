import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvConfig } from '../../../common/config/env.validation';

export interface SendResult {
  success: boolean;
  providerId?: string;
  error?: string;
}

interface TermiiSendResponse {
  message_id?: string;
  message?: string;
  code?: string;
}

/**
 * Thin wrapper around Termii's REST API (docs/16-module-communication.md
 * §1, docs/18-technical-architecture.md §10) — deliberately a single
 * `send(to, message)` method (no Termii-specific types/options leak out)
 * so swapping to Africa's Talking/KudiSMS/BulkSMSNigeria later means
 * rewriting this one file, not every caller.
 *
 * Unlike PaystackService (which throws on a rejected request, since that's
 * one user's single checkout), this never throws — a broadcast fans out to
 * many recipients, and one rejected/failed send must not abort everyone
 * else's. Callers persist `success`/`error` themselves (BroadcastRecipient
 * rows) rather than catching an exception per recipient.
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly apiKey: string;
  private readonly senderId: string;
  private readonly baseUrl: string;

  constructor(configService: ConfigService<EnvConfig, true>) {
    this.apiKey = configService.get('TERMII_API_KEY', { infer: true });
    this.senderId = configService.get('TERMII_SENDER_ID', { infer: true });
    this.baseUrl = configService.get('TERMII_BASE_URL', { infer: true });
  }

  async send(to: string, message: string): Promise<SendResult> {
    const normalized = this.normalizePhone(to);
    if (!normalized) {
      const error = `No usable phone number to send SMS to (got: ${JSON.stringify(to)})`;
      this.logger.warn(error);
      return { success: false, error };
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/sms/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: this.apiKey,
          to: normalized,
          from: this.senderId,
          sms: message,
          type: 'plain',
          channel: 'generic',
        }),
        // A broadcast can fan out to hundreds of recipients sequentially
        // (see BroadcastsService.fanOut) — fetch() has no default timeout,
        // so one unresponsive request would otherwise stall every send
        // behind it, and (via the absence-alert listener) block whatever
        // triggered the event in the first place.
        signal: AbortSignal.timeout(10_000),
      });

      const body = (await response
        .json()
        .catch(() => null)) as TermiiSendResponse | null;

      if (!response.ok || !body?.message_id) {
        const error = `Termii rejected the SMS: ${body?.message ?? response.statusText}`;
        this.logger.warn(`SMS to ${normalized} failed — ${error}`);
        return { success: false, error };
      }

      this.logger.log(
        `SMS to ${normalized} sent — Termii message_id ${body.message_id}`,
      );
      return { success: true, providerId: body.message_id };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.name === 'TimeoutError'
            ? 'Termii request timed out after 10s'
            : error.message
          : 'Unknown error';
      this.logger.error(
        `SMS to ${normalized} failed — request error: ${message}`,
      );
      return { success: false, error: message };
    }
  }

  /**
   * Termii expects international format without a leading `+`
   * (e.g. "2348012345678"). Seed/UI data stores Nigerian numbers as either
   * "+234..." or a local "0..." form — normalize both.
   */
  private normalizePhone(raw: string | null | undefined): string | null {
    if (!raw) return null;
    const digitsOnly = raw.replace(/[^\d+]/g, '');
    if (digitsOnly.startsWith('+')) return digitsOnly.slice(1);
    if (digitsOnly.startsWith('0')) return `234${digitsOnly.slice(1)}`;
    if (digitsOnly.startsWith('234')) return digitsOnly;
    return digitsOnly.length > 0 ? digitsOnly : null;
  }
}
