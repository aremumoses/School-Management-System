'use client';

import { signOut } from 'next-auth/react';
import { useState } from 'react';

/**
 * Logging out, shared by the account menu and the sidebar's Log out button so
 * the two can never drift apart.
 */
export function useLogout() {
  const [loggingOut, setLoggingOut] = useState(false);

  async function logout() {
    setLoggingOut(true);
    try {
      // Revoke the refresh token on the API before clearing the local
      // NextAuth session — see app/api/logout/route.ts for why this is a
      // separate call rather than something signOut() can do itself.
      await fetch('/api/logout', { method: 'POST' });
    } catch {
      // Best-effort — sign out locally regardless.
    }
    await signOut({ callbackUrl: '/login' });
  }

  return { loggingOut, logout };
}
