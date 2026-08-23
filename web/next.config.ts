import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
};

// Stage 11 hardening: wrap with Sentry so source maps are uploaded on
// production builds (needed for readable stack traces in the Sentry UI).
// If SENTRY_AUTH_TOKEN / SENTRY_ORG / SENTRY_PROJECT aren't set, the
// plugin still runs harmlessly — it just skips the upload step.
export default withSentryConfig(nextConfig, {
  // Silent in local dev to avoid noisy output when Sentry isn't configured.
  silent: true,
  // Don't expose source maps to the browser bundle — only upload them to
  // Sentry and delete the local copies afterward.
  sourcemaps: {
    disable: false,
    deleteSourcemapsAfterUpload: true,
  },
});
