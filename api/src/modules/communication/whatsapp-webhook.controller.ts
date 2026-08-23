import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { ConversationsService } from './conversations.service';

/**
 * Inbound WhatsApp messages (docs/16-module-communication.md §6) — public,
 * unauthenticated (the BSP calls this directly, no user session exists),
 * same stance as PaystackService's webhook. No signature verification is
 * implemented here (unlike the Paystack webhook, which HMAC-verifies
 * `x-paystack-signature`) since the exact header/secret Termii's WhatsApp
 * webhook uses isn't confirmed against a real BSP account in this
 * environment — **add signature verification before relying on this for a
 * real deployment**, per docs/18-technical-architecture.md §8's webhook
 * security requirement.
 *
 * Payload shape is a best-effort guess at Termii's inbound WhatsApp
 * webhook (modeled loosely on their inbound-SMS webhook's `{from, sms}`
 * shape, since no WhatsApp-specific webhook sample was available to
 * confirm against) — accepts a few plausible field-name variants
 * defensively. Confirm the real shape against Termii's dashboard once a
 * live WhatsApp sender is provisioned, and tighten this DTO then.
 */
interface InboundWhatsAppPayload {
  from?: string;
  sender?: string;
  phone_number?: string;
  text?: string | { body?: string };
  message?: string | { text?: string; body?: string };
  body?: string;
}

@ApiTags('whatsapp-webhook')
@Controller('communication/webhooks/whatsapp')
export class WhatsAppWebhookController {
  private readonly logger = new Logger(WhatsAppWebhookController.name);

  constructor(private readonly conversationsService: ConversationsService) {}

  @Public()
  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Inbound WhatsApp message webhook (BSP-called, unauthenticated)',
  })
  async receive(
    @Body() payload: InboundWhatsAppPayload,
  ): Promise<{ received: true }> {
    const from = payload.from ?? payload.sender ?? payload.phone_number;
    const body = this.extractText(payload);

    if (!from || !body) {
      this.logger.warn(
        `Inbound WhatsApp webhook payload missing from/text — got keys: ${Object.keys(payload).join(', ')}`,
      );
      return { received: true };
    }

    await this.conversationsService.appendInboundWhatsAppMessage(from, body);
    return { received: true };
  }

  private extractText(payload: InboundWhatsAppPayload): string | undefined {
    if (typeof payload.text === 'string') return payload.text;
    if (payload.text?.body) return payload.text.body;
    if (typeof payload.message === 'string') return payload.message;
    if (payload.message?.text) return payload.message.text;
    if (payload.message?.body) return payload.message.body;
    return payload.body;
  }
}
