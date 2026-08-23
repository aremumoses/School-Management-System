# Stage 10 — Backend Prompt (Hardening, testing & production readiness)

> Copy everything below the line into Claude Code as one message. Assumes Stages 1–9 are complete. This stage doesn't add features — it makes everything already built trustworthy enough for real student and payment data.

---

Read `docs/21-build-guide.md` §8 (Testing Checklist) and §9 (Go-Live Checklist), and `docs/18-technical-architecture.md` §8 (Security) before starting.

## 1. RBAC audit
- Go through **every** module built in Stages 1–9 and confirm every write endpoint has a `@Roles()` guard matching `docs/03-roles-and-permissions.md` §2 exactly. Write (or expand) e2e tests that call each guarded endpoint as a wrong role and assert a 403 — this should end up being one of the largest test files in the project, and that's correct.

## 2. Rate limiting
- Apply `@nestjs/throttler` to `/auth/login`, `/auth/refresh`, and `/webhooks/paystack` specifically — brute-force and webhook-flood are the two realistic attack surfaces here.

## 3. CORS lockdown
- Confirm `FRONTEND_ORIGIN` is set to the real production Vercel/custom domain (not a wildcard) before go-live, and that local/staging origins aren't accidentally left allowed in the production config.

## 4. Observability
- Wire up `@sentry/node`, confirm an intentionally-thrown test error in a non-production environment actually appears in Sentry.
- Expand `/health` to also check Redis connectivity (used by the BullMQ queues since Stage 5), and add a `/health/detailed` (internal-only, not public) endpoint reporting queue depth and last-successful-job timestamps, useful for noticing a stuck worker before a parent notices report cards aren't generating.

## 5. Backups
- Document (in a `RUNBOOK.md` in `/api`) the exact backup/restore procedure for the chosen Postgres provider (Neon/Supabase), and actually perform one test restore into a scratch database, confirming the data matches — don't just document the theory.

## 6. Data correctness spot-checks
- Write a script (or a thorough manual pass) that re-verifies, against the live seed/staging data: ranking/position calculations from Stage 5, invoice balance calculations from Stage 6, and grading-scale lookups — these three are the ones a parent or the Principal will notice immediately if wrong, and they're worth one more dedicated pass before real data goes in.

## 7. Production environment
- Finalize `.env` for production: confirm no secret is shared between `/api` and `/web` env files, Paystack keys are switched from test to live, JWT secret is freshly generated (not reused from development), `DATABASE_URL` points at the production database.

**Done when**: the full e2e test suite passes, a deliberate wrong-role request against a sample of endpoints from every stage is rejected, Sentry receives a test error, a real backup-and-restore has been performed once successfully, and the production environment variables have been reviewed line-by-line against this checklist.
