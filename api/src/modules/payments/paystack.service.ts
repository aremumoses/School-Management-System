import { createHmac, timingSafeEqual } from 'node:crypto';
import { BadGatewayException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvConfig } from '../../common/config/env.validation';

export interface InitializeTransactionInput {
  email: string;
  amountNaira: number;
  reference: string;
  callbackUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface InitializeTransactionResult {
  authorizationUrl: string;
  accessCode: string;
  reference: string;
}

interface PaystackInitializeResponse {
  status: boolean;
  message: string;
  data: { authorization_url: string; access_code: string; reference: string };
}

/**
 * Thin wrapper around Paystack's REST API (docs/15-module-fees-payments.md
 * §4/§10) — the secret key never leaves this service; nothing it returns
 * to callers includes it. Standard/hosted checkout only (return an
 * authorization_url for the frontend to open), so there's no need for the
 * public key anywhere server-side.
 */
@Injectable()
export class PaystackService {
  private readonly secretKey: string;
  private readonly baseUrl: string;

  constructor(configService: ConfigService<EnvConfig, true>) {
    this.secretKey = configService.get('PAYSTACK_SECRET_KEY', { infer: true });
    this.baseUrl = configService.get('PAYSTACK_BASE_URL', { infer: true });
  }

  async initializeTransaction(
    input: InitializeTransactionInput,
  ): Promise<InitializeTransactionResult> {
    const response = await fetch(`${this.baseUrl}/transaction/initialize`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: input.email,
        // Paystack amounts are in kobo (1 naira = 100 kobo).
        amount: Math.round(input.amountNaira * 100),
        reference: input.reference,
        callback_url: input.callbackUrl,
        metadata: input.metadata,
      }),
    });

    const body = (await response.json().catch(() => null)) as
      | PaystackInitializeResponse
      | { status: false; message: string }
      | null;

    if (!response.ok || !body?.status) {
      throw new BadGatewayException(
        `Paystack rejected the checkout request: ${body?.message ?? response.statusText}`,
      );
    }

    const data = body.data;
    return {
      authorizationUrl: data.authorization_url,
      accessCode: data.access_code,
      reference: data.reference,
    };
  }

  /**
   * docs §10 — verified against the raw request body (not the
   * re-serialized parsed object, which can differ byte-for-byte from what
   * Paystack actually signed) before anything else happens with a webhook
   * delivery. `timingSafeEqual` avoids leaking how many leading bytes
   * matched via response-time differences; it requires equal-length
   * buffers, so a length mismatch (e.g. a missing/malformed header) is
   * checked first rather than passed through.
   */
  verifySignature(
    rawBody: Buffer,
    signatureHeader: string | undefined,
  ): boolean {
    if (!signatureHeader) return false;
    const expected = createHmac('sha512', this.secretKey)
      .update(rawBody)
      .digest('hex');
    const expectedBuffer = Buffer.from(expected, 'utf8');
    const actualBuffer = Buffer.from(signatureHeader, 'utf8');
    if (expectedBuffer.length !== actualBuffer.length) return false;
    return timingSafeEqual(expectedBuffer, actualBuffer);
  }
}
