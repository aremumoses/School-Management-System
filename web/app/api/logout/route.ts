import { getToken } from 'next-auth/jwt';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Revokes the refresh token on the NestJS side before the client clears its
 * local NextAuth session. Uses getToken() (the lower-level JWT reader)
 * rather than auth()/the session() callback, because the refresh token is
 * deliberately NOT exposed through the public session shape (see auth.ts) —
 * it never needs to reach client-side JS except for this one server-side
 * revocation call.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const refreshToken = token?.refreshToken;
  if (typeof refreshToken === 'string') {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
    } catch {
      // Best-effort — the client clears its local session regardless, and
      // the refresh token will simply expire naturally if this failed.
    }
  }

  return NextResponse.json({ ok: true });
}
