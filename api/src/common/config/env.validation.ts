import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  // Defaults to 4000, not Next.js's default 3000, so the API and the
  // frontend (run separately in local dev) don't collide by default.
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  FRONTEND_ORIGIN: z.string().min(1, 'FRONTEND_ORIGIN is required'),

  // Deliberately separate secrets for access vs refresh tokens, so a leaked
  // access-token secret can't be used to forge refresh tokens (and vice
  // versa). Generate each with `openssl rand -base64 32`.
  JWT_ACCESS_SECRET: z
    .string()
    .min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // Object storage (S3-compatible — works against AWS S3, Supabase Storage,
  // Cloudflare R2, or local MinIO in dev). See common/storage/storage.service.ts.
  STORAGE_ENDPOINT: z.string().min(1, 'STORAGE_ENDPOINT is required'),
  STORAGE_REGION: z.string().default('us-east-1'),
  STORAGE_BUCKET: z.string().min(1, 'STORAGE_BUCKET is required'),
  STORAGE_ACCESS_KEY_ID: z.string().min(1, 'STORAGE_ACCESS_KEY_ID is required'),
  STORAGE_SECRET_ACCESS_KEY: z
    .string()
    .min(1, 'STORAGE_SECRET_ACCESS_KEY is required'),
  // The base URL a browser can use to fetch an uploaded object back —
  // usually the same as STORAGE_ENDPOINT, but kept separate because a
  // production bucket is often fronted by a CDN/custom domain that differs
  // from the API endpoint used to write to it.
  STORAGE_PUBLIC_URL_BASE: z
    .string()
    .min(1, 'STORAGE_PUBLIC_URL_BASE is required'),
  // MinIO and most non-AWS S3-compatible services need path-style addressing
  // (host/bucket/key) rather than AWS's default virtual-hosted style
  // (bucket.host/key).
  STORAGE_FORCE_PATH_STYLE: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),

  // BullMQ queue backend (docs/18-technical-architecture.md §5) — local
  // Redis in dev, Upstash in production. Report-card PDF generation is the
  // first job this app enqueues; more (bulk SMS/email, scheduled fee
  // reminders) land on the same connection in later stages.
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),

  // Paystack (docs/15-module-fees-payments.md §4/§10) — secret key only,
  // never exposed to the frontend. Used both to call their REST API and to
  // HMAC-verify the `x-paystack-signature` header on incoming webhooks.
  PAYSTACK_SECRET_KEY: z.string().min(1, 'PAYSTACK_SECRET_KEY is required'),
  PAYSTACK_BASE_URL: z.string().default('https://api.paystack.co'),

  // Termii (docs/16-module-communication.md §1/§10) — Nigerian SMS gateway.
  // Required (like PAYSTACK_SECRET_KEY above) so a misconfigured deploy
  // fails fast at boot rather than silently no-op-ing every SMS send;
  // local dev/test runs against a placeholder key (SmsService logs and
  // records FAILED rather than crashing when Termii rejects it).
  TERMII_API_KEY: z.string().min(1, 'TERMII_API_KEY is required'),
  TERMII_SENDER_ID: z.string().default('DemoSchool'),
  TERMII_BASE_URL: z.string().default('https://v3.api.termii.com'),

  // Resend (docs/16-module-communication.md §1/§10) — outbound email.
  RESEND_API_KEY: z.string().min(1, 'RESEND_API_KEY is required'),
  EMAIL_FROM: z.string().default('noreply@demoschool.ng'),

  // WhatsApp Business API via Termii's WhatsApp product (Stage 28, docs/16
  // §1/§10) — same required-with-placeholder stance as Termii/Resend above.
  WHATSAPP_API_KEY: z.string().min(1, 'WHATSAPP_API_KEY is required'),
  WHATSAPP_SENDER_ID: z.string().default('2348000000000'),
  WHATSAPP_BASE_URL: z.string().default('https://v3.api.termii.com'),

  // Web Push VAPID keys (Stage 28) — unlike Termii/Resend/WhatsApp, these
  // are a self-generated keypair with no external account dependency, so
  // there's no "placeholder" tier: required at boot, and (unlike the SMS/
  // email/WhatsApp providers) a real, working push actually can be sent
  // against these before a live BSP account exists for the others.
  VAPID_PUBLIC_KEY: z.string().min(1, 'VAPID_PUBLIC_KEY is required'),
  VAPID_PRIVATE_KEY: z.string().min(1, 'VAPID_PRIVATE_KEY is required'),
  VAPID_SUBJECT: z.string().default('mailto:admin@demoschool.ng'),

  // AI-assisted report-card comment suggestions (Stage 30, docs/19 §4) —
  // same required-with-placeholder stance as Termii/Resend/WhatsApp above:
  // a placeholder lets the app boot and every non-LLM part of the pipeline
  // (data assembly, rate limiting, draft-only save behavior) be built and
  // verified before a real Anthropic account exists.
  ANTHROPIC_API_KEY: z.string().min(1, 'ANTHROPIC_API_KEY is required'),
  ANTHROPIC_MODEL: z.string().default('claude-sonnet-5'),

  // Sentry (Stage 11 hardening) — genuinely optional, unlike the
  // required-with-placeholder pattern above for Termii/Resend: no
  // user-facing feature depends on error tracking working, so an empty
  // value should just disable it rather than fail validation. The Sentry
  // SDK itself safely no-ops every capture call when dsn is undefined.
  SENTRY_DSN: z.string().optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

/**
 * Passed to ConfigModule.forRoot's `validate` option so the app fails fast at
 * startup with a clear error instead of surfacing a confusing failure later
 * (e.g. an undefined DATABASE_URL only blowing up on the first query).
 */
export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return result.data;
}
