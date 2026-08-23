import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvConfig } from '../../../common/config/env.validation';
import type { SendResult } from './sms.service';

interface TermiiWhatsAppSendResponse {
  message_id?: string;
  message?: string;
  code?: string;
}

/**
 * Thin wrapper around Termii's WhatsApp Business API product
 * (docs/16-module-communication.md §1/§10, docs/18-technical-architecture.md
 * §10 — "WhatsApp: WhatsApp Business API (via a BSP like Termii, 360dialog,
 * or Twilio)"). Same account/api_key as SmsService (Termii is already the
 * SMS gateway this build uses), a different sender + endpoint — modeled on
 * Termii's documented WhatsApp send endpoint shape, not 360dialog's (swap
 * this one file if the school's actual BSP contract ends up being
 * 360dialog instead). Same non-throwing `{success, error}` contract as
 * SmsService/EmailService, for the same fan-out-must-not-abort reasoning.
 */
@Injectable()
export class WhatsAppProviderService {
  private readonly logger = new Logger(WhatsAppProviderService.name);
  private readonly apiKey: string;
  private readonly senderId: string;
  private readonly baseUrl: string;

  constructor(configService: ConfigService<EnvConfig, true>) {
    this.apiKey = configService.get('WHATSAPP_API_KEY', { infer: true });
    this.senderId = configService.get('WHATSAPP_SENDER_ID', { infer: true });
    this.baseUrl = configService.get('WHATSAPP_BASE_URL', { infer: true });
  }

  async send(to: string, message: string): Promise<SendResult> {
    const normalized = this.normalizePhone(to);
    if (!normalized) {
      const error = `No usable phone number to send WhatsApp message to (got: ${JSON.stringify(to)})`;
      this.logger.warn(error);
      return { success: false, error };
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/whatsapp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: this.apiKey,
          to: normalized,
          from: this.senderId,
          type: 'text',
          text: message,
        }),
        // Same reasoning as SmsService — a broadcast fans out sequentially,
        // one unresponsive request must not stall everyone behind it.
        signal: AbortSignal.timeout(10_000),
      });

      const body = (await response
        .json()
        .catch(() => null)) as TermiiWhatsAppSendResponse | null;

      if (!response.ok || !body?.message_id) {
        const error = `Termii WhatsApp rejected the message: ${body?.message ?? response.statusText}`;
        this.logger.warn(`WhatsApp to ${normalized} failed — ${error}`);
        return { success: false, error };
      }

      this.logger.log(
        `WhatsApp to ${normalized} sent — Termii message_id ${body.message_id}`,
      );
      return { success: true, providerId: body.message_id };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.name === 'TimeoutError'
            ? 'Termii WhatsApp request timed out after 10s'
            : error.message
          : 'Unknown error';
      this.logger.error(
        `WhatsApp to ${normalized} failed — request error: ${message}`,
      );
      return { success: false, error: message };
    }
  }

  /** Same normalization as SmsService — Termii's WhatsApp product expects the same international-without-leading-plus format. */
  private normalizePhone(raw: string | null | undefined): string | null {
    if (!raw) return null;
    const digitsOnly = raw.replace(/[^\d+]/g, '');
    if (digitsOnly.startsWith('+')) return digitsOnly.slice(1);
    if (digitsOnly.startsWith('0')) return `234${digitsOnly.slice(1)}`;
    if (digitsOnly.startsWith('234')) return digitsOnly;
    return digitsOnly.length > 0 ? digitsOnly : null;
  }
}
