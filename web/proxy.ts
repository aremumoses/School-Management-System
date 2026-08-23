import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import {
  getDashboardConfig,
  isRoleAllowed,
  primaryDashboardPath,
} from '@/lib/dashboard-config';
import type { SchoolModuleId } from '@/lib/school-modules';
import type { SchoolDto } from '@/lib/types/academic';

// Stage 13's toggleable modules, gated for the handful of routes that exist
// solely to serve one of them (nested inside another role's dashboard, so
// hiding the nav item alone isn't enough — a bookmarked or typed URL would
// still work). Checked here rather than in each route's own layout.tsx: a
// redirect() thrown from a nested Server Component layout degrades to a
// client-side meta-refresh once streaming has started (see the "/" redirect
// comment below), which non-JS clients never see — proxy runs before any
// rendering begins and can always send a clean top-level 307.
const MODULE_GATED_ROUTES: { prefix: string; module: SchoolModuleId; fallback: string }[] = [
  { prefix: '/student/cbt', module: 'CBT', fallback: '/student' },
  { prefix: '/student/library', module: 'LIBRARY', fallback: '/student' },
  { prefix: '/teacher/cbt', module: 'CBT', fallback: '/teacher' },
  { prefix: '/exam-officer/question-bank', module: 'CBT', fallback: '/exam-officer' },
  { prefix: '/parent/leave-requests', module: 'HOSTEL', fallback: '/parent' },
];

// Next.js 16 renamed the "middleware" file convention to "proxy" — same
// functionality, see https://nextjs.org/docs/app/api-reference/file-conventions/proxy.
//
// This is the "optimistic" check (reads the session straight out of the
// JWT cookie, no DB/network call — see Next's authentication guide). Each
// dashboard layout also calls requireDashboardAccess() server-side as a
// second, closer-to-the-data check, per the same guide's recommendation not
// to rely on proxy as the only line of defense.
const PROTECTED_SEGMENTS = [
  'admin',
  'teacher',
  'bursar',
  'exam-officer',
  'librarian',
  'hostel-transport',
  'hr',
  'front-desk',
  'student',
  'parent',
  // Not a dashboard (no config, so no role gate here) — the CBT exam-mode
  // screen. Ownership is enforced by the API; this just forces sign-in.
  'exam',
];

export default auth(async (req) => {
  const { pathname } = req.nextUrl;
  const segment = pathname.split('/')[1];
  const isProtected = PROTECTED_SEGMENTS.includes(segment);
  const isLoginPage = pathname === '/login';
  const isRoot = pathname === '/';
  const session = req.auth;

  // A failed token refresh (revoked/expired refresh token, or the API was
  // unreachable) leaves a "session" that's no longer actually usable — see
  // the matching check in lib/require-dashboard-access.ts. Checked in one
  // combined condition (rather than via a separate boolean) so TypeScript
  // can still narrow `session.user` as defined below.
  if (!session?.user || session.error === 'RefreshAccessTokenError') {
    if (isProtected || isRoot) {
      const loginUrl = new URL('/login', req.nextUrl.origin);
      if (!isRoot) loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // Handle "/" here too, not just in app/page.tsx — a redirect thrown from
  // an async Server Component can degrade to a slower client-side
  // meta-refresh once streaming has already started, whereas proxy runs
  // before any rendering begins and can always send a clean top-level
  // redirect. app/page.tsx's own redirect() stays as a defensive fallback.
  if (isLoginPage || isRoot) {
    return NextResponse.redirect(
      new URL(primaryDashboardPath(session.user.roles), req.nextUrl.origin),
    );
  }

  if (isProtected) {
    const config = getDashboardConfig(segment);
    if (config && !isRoleAllowed(config, session.user.roles)) {
      return NextResponse.redirect(
        new URL(primaryDashboardPath(session.user.roles), req.nextUrl.origin),
      );
    }
  }

  const gate = MODULE_GATED_ROUTES.find((r) => pathname.startsWith(r.prefix));
  if (gate) {
    const enabled = await getEnabledModules();
    if (!enabled.has(gate.module)) {
      return NextResponse.redirect(new URL(gate.fallback, req.nextUrl.origin));
    }
  }

  return NextResponse.next();
});

async function getEnabledModules(): Promise<Set<string>> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/school`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) return new Set();
    const school = (await res.json()) as SchoolDto;
    return new Set(school.enabledModules);
  } catch {
    // Fail open — a slow/unreachable API shouldn't block navigation to a
    // page the nav already thought was enabled; the layout-level
    // requireModuleEnabled() fallback (see lib/school-modules.ts) is the
    // defense-in-depth backstop for the rare case this masks a real outage.
    return new Set(['HOSTEL', 'TRANSPORT', 'LIBRARY', 'CBT']);
  }
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|manifest.webmanifest).*)'],
};
