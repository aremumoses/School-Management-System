'use client';

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react';

/**
 * Thin client-boundary re-export — Server Components (the root layout)
 * can't directly render next-auth/react's provider, which needs
 * its own 'use client' module.
 */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>;
}
