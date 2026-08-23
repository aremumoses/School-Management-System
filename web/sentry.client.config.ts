// Stage 11 hardening — Sentry client-side configuration.
// Loaded automatically by @sentry/nextjs before any user code runs,
// so errors during client-side rendering are captured too.
//
// SENTRY_DSN is intentionally left optional (same convention as the
// backend's env.validation.ts: the app continues normally without it,
// Sentry calls become no-ops). Set NEXT_PUBLIC_SENTRY_DSN in .env.local
// or the Vercel environment to enable real error reporting.

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  environment: process.env.NODE_ENV ?? 'development',

  // Trace a fraction of navigations for performance monitoring;
  // 0.1 in prod (1 in 10 page loads) is a reasonable starting point
  // that gives signal without excessive cost.
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Don't send events in local development unless DSN is explicitly set.
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
});
