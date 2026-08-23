# API Runbook

Operational reference for the School Management System API. Written and tested during Stage 11 hardening (see `docs/22-implementation-status.md` §0).

---

## 1. Prerequisites

- Node.js ≥ 20 (`node --version`)
- PostgreSQL 16 (`pg_dump --version`) — verify the client tools match the server version, or Postgres will warn
- Redis running (`redis-cli ping` → `PONG`)
- MinIO or S3-compatible storage accessible (`curl $STORAGE_ENDPOINT` responds)

---

## 2. Environment configuration

Production `.env` must contain **all** keys listed in `src/common/config/env.validation.ts`. Checklist before go-live:

| Key | Production value | Notes |
|---|---|---|
| `NODE_ENV` | `production` | Must not be `development` — affects Sentry environment tag |
| `DATABASE_URL` | Production Postgres connection string (Neon/Supabase) | Test: `psql $DATABASE_URL -c "SELECT 1"` |
| `FRONTEND_ORIGIN` | Exact Vercel/custom domain, e.g. `https://yourdomain.ng` | **No wildcard, no trailing slash.** CORS rejects anything else. |
| `JWT_ACCESS_SECRET` | Fresh 32+ char random string | `openssl rand -base64 32` — never reuse a dev secret in prod |
| `JWT_REFRESH_SECRET` | Fresh 32+ char random string | Different from `JWT_ACCESS_SECRET` |
| `STORAGE_ENDPOINT` | Production S3/Supabase Storage endpoint | |
| `REDIS_HOST` / `REDIS_PORT` | Upstash Redis host + port | |
| `PAYSTACK_SECRET_KEY` | Live key (starts `sk_live_`) | Swap from test key (`sk_test_`) at go-live |
| `TERMII_API_KEY` | Live Termii API key | |
| `RESEND_API_KEY` | Live Resend key | |
| `WHATSAPP_API_KEY` | Live Termii WhatsApp product key (Stage 28) | Requires a separate BSP-approved WhatsApp sender number from Termii — a plain SMS sender ID does not work here |
| `WHATSAPP_SENDER_ID` | The approved WhatsApp Business phone number | Full international format, no `+` |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Self-generated keypair (Stage 28) | Generate once: `node -e "console.log(require('web-push').generateVAPIDKeys())"`. Rotating these invalidates every existing push subscription — users must re-grant notification permission. |
| `ANTHROPIC_API_KEY` | Live key from console.anthropic.com (Stage 30) | AI-assisted report-card comment suggestions — get a key, no separate BSP approval needed |
| `ANTHROPIC_MODEL` | `claude-sonnet-5` (or later) | Defaults to the current-generation model; bump this string as newer models ship |
| `SENTRY_DSN` | Project DSN from sentry.io | Optional — app still runs without it, just no error reporting |

**CORS note**: set `FRONTEND_ORIGIN` to the single allowed origin. A wrong value here means every browser request from the real frontend will fail at the CORS preflight with no obvious error. Confirm with:
```
curl -H "Origin: https://yourdomain.ng" -I http://localhost:4000/health
# Must see: Access-Control-Allow-Origin: https://yourdomain.ng
```

---

## 3. Backup and restore (PostgreSQL)

### 3a. Create a backup

```bash
pg_dump "$DATABASE_URL" \
  --format=custom \
  --file="sms_backup_$(date +%Y%m%d_%H%M%S).pgdump"
```

Custom format (not plain SQL) is preferred: it compresses the dump, supports selective restore, and is orders of magnitude faster to restore large databases.

**Automate this**: most hosted Postgres providers (Neon, Supabase) take automatic daily backups. Enable and confirm the retention period before putting real student data in. Log into the provider dashboard and verify "Backups" or "Point-in-time recovery" is enabled and showing recent snapshots.

### 3b. Restore into a scratch database (tested: 2026-07-01, re-tested: 2026-07-09)

Performed successfully twice: on 2026-07-01 (Stage 11, 21 students, schema much smaller) and again on 2026-07-09 (Stage 31 hardening pass, schema now 116 tables after Stages 12-30). Both times every row count matched exactly between source and restored database (Stage 31 re-test: 23 students, 3 payments, 7 staff, 10,692 audit log rows, 116/116 tables — all identical). **The restore itself took well under a second even at 116 tables** — schema growth hasn't meaningfully changed the procedure's timing or steps; the custom `pg_dump` format keeps this fast regardless of table count.

```bash
# 1. Create a scratch target (never restore over the live database directly)
createdb sms_dev_restore_test

# 2. Restore the dump
pg_restore --dbname=sms_dev_restore_test sms_backup_YYYYMMDD_HHmmss.pgdump

# 3. Spot-check the restore — compare against the SAME queries run against the source DB
psql sms_dev_restore_test -c 'SELECT count(*) FROM "Student";'
psql sms_dev_restore_test -c 'SELECT count(*) FROM "Payment";'
psql sms_dev_restore_test -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';"
# These counts should match what you see on the source database.

# 4. Drop the scratch database when confirmed
dropdb sms_dev_restore_test
```

**If `psql`/`pg_dump`/`pg_restore`/`createdb`/`dropdb` aren't on `$PATH`** (common on a Homebrew install where `postgresql@16` is keg-only): find them at `$(brew --prefix)/Cellar/postgresql@16/<version>/bin/` and prepend that directory to `$PATH` for the session, or use the full path directly. Also note `psql`'s connection string doesn't accept Prisma's `?schema=public` query parameter on `DATABASE_URL` — strip it before passing the URL to any `pg_*`/`psql` command.

**Production restore procedure**: never restore directly over `DATABASE_URL` while the API is serving traffic. Instead:
1. Provision a separate Postgres instance or use a non-production branch (Neon supports database branches for exactly this).
2. Restore there, verify counts match, confirm a few spot-check rows.
3. Only then redirect `DATABASE_URL` (via env var update + API restart) — treating the restored database as the new primary.

### 3c. Test restore cadence

Perform a real restore test at least:
- Before going live (done ✅ 2026-07-01)
- After each schema migration that adds a non-nullable column or renames a table (restoring from a backup taken before the migration confirms forward compatibility)
- Once per term for the production database (regular muscle-memory exercise, not just theory)

---

## 4. Health checks

### `GET /health` (public, used by load balancers / uptime monitors)

Returns `200 { status:"ok", db:"connected", redis:"connected" }` when both Postgres and Redis are reachable. Returns `503` if either is down.

### `GET /health/detailed` (requires `ADMIN` JWT, internal only)

Returns per-queue stats for every BullMQ queue (5, as of Stage 31 — `offer-letters` and `payslips` were added to this endpoint that stage; check this list again after adding any new queue in future stages):

```json
{
  "queues": [
    { "name": "documents",      "waiting": 0, "active": 0, "failed": 0, "delayed": 0, "lastCompletedAt": "2026-07-01T10:00:00.000Z" },
    { "name": "receipts",       "waiting": 0, "active": 0, "failed": 0, "delayed": 0, "lastCompletedAt": "2026-07-01T09:55:00.000Z" },
    { "name": "report-cards",   "waiting": 0, "active": 0, "failed": 0, "delayed": 0, "lastCompletedAt": null },
    { "name": "offer-letters",  "waiting": 0, "active": 0, "failed": 0, "delayed": 0, "lastCompletedAt": null },
    { "name": "payslips",       "waiting": 0, "active": 0, "failed": 0, "delayed": 0, "lastCompletedAt": null }
  ]
}
```

**Stale failed jobs**: a `failed` count that never drops even after fixing the root cause usually means the jobs reference test fixtures (students/arms/staff) that were since deleted — they'll never succeed on retry. Confirmed harmless via `queue.getFailed()` (check the error message for something like "Arm not found") before clearing with `queue.clean(0, 10000, 'failed')` on that queue. Stage 31 found and cleared 490 such jobs (184 receipts, 300 report-cards, 6 offer-letters) accumulated from earlier stages' own testing.

**What to watch for**:
- `failed > 0`: a PDF generation or receipt job has permanently failed (exhausted retries). Check `railway logs` / `fly logs` for the `[DocumentProcessor]`/`[ReceiptProcessor]`/`[ReportCardProcessor]` error. Re-run the job manually (call `POST /documents/:id/approve` or `POST /payments/:id/regenerate-receipt` again, whichever is relevant) after fixing the underlying cause (usually a Puppeteer timeout or S3 credential issue).
- `waiting` growing but `active` at zero: the BullMQ worker process is not running or is deadlocked. Restart the API (the worker runs in-process).
- `lastCompletedAt` is null: that specific queue has never successfully completed a job since the last restart — expected for `report-cards` in the early stages when no results have been published yet; investigate if `receipts` or `documents` shows null in production with active traffic.

---

## 5. Rate limits

The following endpoints are rate-limited (enforced by `@nestjs/throttler`, disabled in `NODE_ENV=test`):

| Endpoint | Limit |
|---|---|
| `POST /auth/login` | 5 requests/minute per IP |
| `POST /auth/refresh` | 10 requests/minute per IP |
| `POST /webhooks/paystack` | 30 requests/minute per IP |

Rate-limited responses return HTTP 429. If a legitimate user hits the login limit (e.g., after 5 failed attempts), they must wait 60 seconds. Advise them to wait, or clear the counter by restarting the API in emergencies (the counter is in-memory per process — a restart resets all limits).

---

## 6. Sentry error reporting

Sentry is initialized in `src/main.ts` before the NestJS app boots (so startup errors are captured too). The exception filter at `src/common/filters/http-exception.filter.ts` sends every `5xx` to Sentry, attaching the caller's `userType` and `roles` as tags — never PII (name, email).

If `SENTRY_DSN` is unset or empty, all Sentry calls become no-ops. The app continues serving normally; errors are logged to stdout only.

To confirm Sentry is receiving events in a staging environment, deliberately throw a test error via `src/health/health.controller.ts`'s check endpoint (temporarily add a `throw new Error('sentry test')` in the ADMIN-gated `/health/detailed` handler, call it, check Sentry, remove the throw and redeploy).

---

## 7. Deployments

Standard deploy:
```bash
npm run build                    # TypeScript → dist/
node dist/src/main.js            # start compiled server
```

The BullMQ worker processors run in-process (not separate workers), so a single `node dist/src/main.js` runs both the HTTP server and all three queue workers. This is the correct setup for a single-server initial deployment.

### Database migration on deploy

```bash
npx prisma migrate deploy         # applies pending migrations in order
```

Run this **before** starting the new server binary, not after — migrations are backward-compatible by design (new nullable columns, new tables, never dropping used columns), so the old binary can safely read the new schema while the migration runs.

---

## 8. Stage 28 — WhatsApp, Push, USSD

### WhatsApp (`WhatsAppProviderService`)

1. Provision a WhatsApp Business sender under the school's Termii account (separate approval process from Termii's plain SMS sender ID — a WhatsApp number must be registered with Meta and approved before it can send).
2. Set `WHATSAPP_API_KEY`/`WHATSAPP_SENDER_ID` (§2 above).
3. **Inbound webhook**: point Termii's WhatsApp inbound-message webhook at `POST https://<api-domain>/communication/webhooks/whatsapp`. The payload shape this endpoint expects is a best-effort guess (see the controller's own doc comment) — confirm the real shape against Termii's dashboard once a live sender exists, and add signature verification before trusting it in production (this endpoint currently has none, unlike the Paystack webhook).
4. Confirm delivery: send a broadcast/fee-reminder that includes the `WHATSAPP` channel and check the resulting `BroadcastRecipient` rows' `status`/`errorMessage`.

### Push notifications (`PushProviderService`)

VAPID keys are self-generated — no external account needed, and (unlike WhatsApp/SMS/Email above) a real push actually can be delivered against the keys already in `.env` before any other provider is live. Rotating `VAPID_PRIVATE_KEY` invalidates every existing subscription (`PushSubscription` rows become permanently undeliverable) — anyone who already granted notification permission must revisit the site and re-subscribe.

### USSD (`UssdController`/`UssdService`, Phase 3 — lowest priority)

Modeled on Africa's Talking's stateless USSD menu protocol (see `dto/ussd.dto.ts`'s doc comment). To go live:

1. Register a short code with a Nigerian USSD aggregator (Africa's Talking, or whichever the school's telco relationship supports) and confirm their request field names match `UssdRequestDto` (`sessionId`/`serviceCode`/`phoneNumber`/`text`) — adjust the DTO if the real aggregator's contract differs.
2. Point the aggregator's callback URL at `POST /ussd`.
3. A guardian must set a USSD PIN first (`POST /ussd/pin`, authenticated, from the parent portal) — there is no way to use the USSD menu before this, by design (phone + PIN is the only authentication USSD has).
4. Without an aggregator account, exercise the menu logic directly: `curl -X POST http://localhost:4000/ussd -d "sessionId=test&serviceCode=*384*1#&phoneNumber=<a guardian's phone>&text="` and continue with `text=<pin>`, `text=<pin>*1`, etc., matching the aggregator's real request shape.

---

## 9. Stage 30 — AI-assisted report-card comments

1. Get a key at [console.anthropic.com](https://console.anthropic.com) and set `ANTHROPIC_API_KEY` (§2 above). `ANTHROPIC_MODEL` defaults to `claude-sonnet-5` — bump it as newer models ship.
2. Suggestions are returned only, **never auto-saved** — `POST /results/:classArmId/:termId/students/:studentId/suggest-comment` (`CLASS_TEACHER` for `FORM_TEACHER`, `ADMIN` for either type) returns `{ suggestion }`; the comment only reaches `StudentTermResult` through the existing `submitConduct`/`setPrincipalComment` endpoints, called explicitly by a human.
3. Rate-limited to 20 requests/minute per the Stage 11 throttler pattern — a Class Teacher batch-suggesting across a whole class is the expected normal load; a rapid duplicate-click burst should 429.
4. Without a real key, every call fails with a clean `503` (`"Couldn't generate a suggestion right now…"`) rather than crashing — confirm the pipeline up to that point still works: `curl -X POST http://localhost:4000/results/<armId>/<termId>/students/<studentId>/suggest-comment -H "Authorization: Bearer <token>" -H "Content-Type: application/json" -d '{"commentType":"FORM_TEACHER"}'`.
5. Each suggestion request is logged to `AuditLog` (`action: 'COMMENT_SUGGESTION_REQUESTED'`) with a deliberately minimal input summary (first name + a few numeric data points, not full bio-data) alongside the model's output, for traceability.

---

## 10. Stage 31 — Phase 2/3 hardening & go-live

Final re-audit of everything built in Stages 12–30. Full findings in memory (`project_stage31_hardening.md`); operationally relevant bits only, here:

**RBAC fixes** (docs/03-roles-and-permissions.md §2 cross-referenced against every Stage 12–30 controller):
- CBT: `CLASS_TEACHER` had been included in `AUTHOR_ROLES`/`BUILDER_ROLES`/`grade-essay`'s roles since an earlier stage — the matrix gives Class Teacher no CBT access at all. Removed.
- Admissions: `HR_OFFICER` was missing from `list()`/`get()` (matrix gives them view access); `VICE_PRINCIPAL` was missing from `convert()` (they can already `review()` — couldn't complete an enrollment they'd approved). Both added.
- A systemic finding — Admin has full write access in Front Desk/Library/Hostel/Transport/CBT where the matrix caps Admin at View-only — was surfaced to the user and **deliberately left as-is** (explicit decision, not an oversight). Don't "fix" this without asking again.

**Data-correctness spot-checks** (all passed against real live data, no fixes needed): payroll PAYE/pension hand-verified against a fresh manual calculation; CBT auto-grading verified via a real live attempt across all 4 question types; timetable conflict detection verified with a deliberately overlapping fixture (both arm-clash and teacher-clash branches); hostel unapproved-boarder-absence escalation confirmed firing.

**Module toggle enforcement** (the most significant frontend finding): Stage 13's Settings → Module Toggles UI had **zero actual effect** — confirmed live that disabling a module left its nav links rendering and its routes fully accessible. Fixed with three layers:
1. `NavItem.module` tags + filtering in `createDashboardLayout` (`lib/dashboard-pages.tsx`) — hides nav entries for a disabled module across every dashboard that references one (teacher, exam-officer, student, parent, hostel-transport).
2. `DashboardConfig.requiresAnyModule` — for a segment that's entirely one module (librarian → LIBRARY; hostel-transport → HOSTEL or TRANSPORT), renders a "module disabled" placeholder instead of the page.
3. `proxy.ts`'s `MODULE_GATED_ROUTES` table — redirects a handful of single-purpose routes nested inside another dashboard (`/student/cbt`, `/student/library`, `/teacher/cbt`, `/exam-officer/question-bank`, `/parent/leave-requests`) back to that dashboard's home when their module is off. **This is the primary enforcement, not the per-route `layout.tsx` guards** (`lib/school-modules.ts`'s `requireModuleEnabled`, kept only as a defense-in-depth fallback) — a `redirect()` thrown from a nested layout degrades to a client-side meta-refresh once streaming has started, which curl/e2e/non-JS clients never see. Confirmed via curl before and after this fix: same request went from `HTTP 200` (full page content) to a real `HTTP 307`.

If you add a 5th toggleable module, or a new route that should be module-gated, update all three of the above — tagging a `NavItem` alone is not enough to actually block direct navigation.

**Other frontend fixes**: `DataTable`'s sortable column headers (`components/dashboard/data-table.tsx`) had no `tabIndex`/`onKeyDown`/ARIA — keyboard-unreachable across every consumer (Payroll, Payslips, Vacancies, etc.); added. Three real empty-state gaps (HR staff attendance report, HR payroll-run payslips table, hostel rooms' "no hostels yet" case) plus three minor ones. Five incident-log screens (Stage 9/21/23/25/26) unified on one `formatLoggedAt()` date helper and the shared `<Empty>` component with icon (two of the five were using a bare `<p>`); Stage 25's hostel discipline cross-reference was entirely unreachable (backend supported `HOSTEL_WARDEN` logging incidents since Stage 9, no nav entry or page ever existed) — added `/hostel-transport/discipline` reusing the same `IncidentList`/`IncidentForm` components as `/admin/discipline`.

**Ops**: backup/restore re-tested successfully against the grown 116-table schema (§3b above); `/health/detailed` now covers all 5 queues (§4 above); env audit confirmed no Stage 28–30 secret (WhatsApp, VAPID, Anthropic) leaked into `web`'s environment.
