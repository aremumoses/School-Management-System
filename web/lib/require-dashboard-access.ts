import 'server-only';
import { redirect } from 'next/navigation';
import type { Session } from 'next-auth';
import { auth } from '@/auth';
import { getDashboardConfig, isRoleAllowed, primaryDashboardPath } from './dashboard-config';

/**
 * The "secure" check, close to the data — called from every dashboard
 * layout.tsx as a second line of defense behind proxy.ts's "optimistic"
 * cookie check (see proxy.ts's comment and Next's authentication guide).
 * Redirects rather than throwing, since landing on your own correct
 * dashboard is a better experience than an error page for this case.
 */
export async function requireDashboardAccess(segment: string): Promise<Session> {
  const session = await auth();
  if (!session?.user) {
    redirect(`/login?callbackUrl=/${segment}`);
  }

  // The jwt() callback in auth.ts sets this when a refresh attempt fails
  // (refresh token revoked/expired, or the API was unreachable) — the
  // session technically still "exists" at this point but its access token
  // is stale, so every subsequent API call would just fail with 401s.
  // Send the user back through login now instead of letting that happen.
  if (session.error === 'RefreshAccessTokenError') {
    redirect(`/login?callbackUrl=/${segment}`);
  }

  const config = getDashboardConfig(segment);
  if (!config || !isRoleAllowed(config, session.user.roles)) {
    redirect(primaryDashboardPath(session.user.roles));
  }

  return session;
}
