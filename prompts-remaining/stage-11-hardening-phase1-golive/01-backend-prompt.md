# Stage 11 — Backend Prompt (Phase 1 hardening, for real this time)

> Copy everything below the line into Claude Code as one message. This is `/prompts/stage-10-hardening-testing-golive`'s backend prompt, re-issued — `docs/22-implementation-status.md` §0 confirms it was never actually executed: no Sentry, no `@nestjs/throttler` anywhere, no `RUNBOOK.md`, no `/health/detailed`. Everything else in Phase 1 (Stages 1–9) is built and tested; this is the one stage that makes it trustworthy enough for real student and payment data, and it should happen before Stage 12 starts, not after.

---

Read `docs/21-build-guide.md` §8 (Testing Checklist) and §9 (Go-Live Checklist), and `docs/18-technical-architecture.md` §8 (Security) before starting.

## 1. RBAC audit
- Go through **every** module in `api/src/modules/*` and confirm every write endpoint has a `@Roles()` guard matching `docs/03-roles-and-permissions.md` §2 exactly. Sample at least 3 endpoints per module and write (or expand) an e2e test that calls each as a wrong role and asserts 403. This should end up one of the largest test files in the project — that's correct, not a sign something went wrong.

## 2. Rate limiting
- Install `@nestjs/throttler` (it is **not currently a dependency** — confirm via `package.json` before assuming otherwise) and apply it to `/auth/login`, `/auth/refresh`, and `/webhooks/paystack` specifically.

## 3. CORS lockdown
- Confirm `FRONTEND_ORIGIN` is read from env (it already is, in `main.ts`) and document in `RUNBOOK.md` (see §5) exactly what value it must be set to in production — not a wildcard, not a staging URL left in alongside it.

## 4. Observability
- Wire up `@sentry/node` (not currently a dependency — confirm). Confirm an intentionally-thrown test error in a non-production environment actually appears in Sentry.
- Expand `/health` (currently a bare controller with no Redis check — confirm via `api/src/health/health.controller.ts`) to also check Redis connectivity (used by every BullMQ queue since Stage 5: report cards, receipts, documents). Add `/health/detailed` (not publicly routable — gate it the same way an internal-only endpoint should be gated) reporting queue depth and last-successful-job timestamp per queue, so a stuck worker is noticeable before a parent notices report cards aren't generating.

## 5. Backups
- Write `RUNBOOK.md` in `/api`: the exact backup/restore procedure for the Postgres provider actually in use, **and perform one real test restore** into a scratch database, confirming the data matches. Document the result, not just the theory.

## 6. Data correctness spot-checks
- Re-verify against live seed data: ranking/position calculations (Stage 5's `GradingService`/ranking logic), invoice balance calculations (Stage 6), and grading-scale lookups (Stage 2/5). These three are the ones a parent or Principal notices first if wrong.

## 7. Production environment
- Review `.env`/`.env.production` line by line: no secret shared between `/api` and `/web`, Paystack keys are live (not test) at actual go-live, JWT secret freshly generated (never reused from development), `DATABASE_URL` points at production.

**Done when**: the full e2e suite passes, a sampled wrong-role request against endpoints from every Stage 1–9 module is rejected, Sentry receives a test error, a real backup-and-restore has been performed once successfully and is documented in `RUNBOOK.md`, and `/health/detailed` correctly reports a stuck-queue scenario when you deliberately pause a worker to test it.
