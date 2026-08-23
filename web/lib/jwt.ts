/**
 * Decodes a JWT's `exp` claim without verifying the signature — safe here
 * because this token was just received directly from our own NestJS API
 * over HTTPS; we're not trusting an externally-supplied token, just reading
 * a timestamp out of one we already trust.
 */
export function decodeJwtExpiryMs(token: string): number | null {
  try {
    const payloadSegment = token.split('.')[1];
    if (!payloadSegment) return null;
    const json = Buffer.from(payloadSegment, 'base64url').toString('utf-8');
    const payload = JSON.parse(json) as { exp?: number };
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}
