import { redirect } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import type { SchoolDto } from '@/lib/types/academic';

export type SchoolModuleId = 'HOSTEL' | 'TRANSPORT' | 'LIBRARY' | 'CBT';

/** `GET /school` is `@Public()` (school name/logo aren't sensitive), so this
 *  is safe to call from any dashboard's layout regardless of the caller's role. */
export async function getEnabledModules(): Promise<Set<string>> {
  const school = await apiFetch<SchoolDto>('/school');
  return new Set(school.enabledModules);
}

/**
 * For a route that exists solely to serve one toggleable module — redirects
 * to `fallbackHref` when it's disabled, since there's nothing sensible to
 * render at the URL itself. proxy.ts's MODULE_GATED_ROUTES table is the
 * primary enforcement (it runs before rendering begins, so it always sends a
 * real HTTP redirect); this is the same defense-in-depth fallback
 * requireDashboardAccess() plays for the role check — a redirect() thrown
 * from a nested layout degrades to a client-side meta-refresh once
 * streaming has started, which a non-JS client (or this app's own e2e/curl
 * checks) never sees, so proxy.ts must not be the only gate removed later.
 */
export async function requireModuleEnabled(
  moduleId: SchoolModuleId,
  fallbackHref: string,
): Promise<void> {
  const enabled = await getEnabledModules();
  if (!enabled.has(moduleId)) {
    redirect(fallbackHref);
  }
}
