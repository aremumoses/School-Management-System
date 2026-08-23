import QRCode from 'qrcode';

/**
 * Server-only — called from a Server Component (page.tsx), never shipped
 * to the client. Generates the QR as a data: URI so the ID card needs no
 * client-side QR library at all (see components/students/id-card.tsx).
 */
export async function generateQrDataUrl(token: string): Promise<string> {
  return QRCode.toDataURL(token, { margin: 1, width: 320 });
}
