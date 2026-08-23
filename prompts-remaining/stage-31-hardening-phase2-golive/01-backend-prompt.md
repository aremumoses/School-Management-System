# Stage 31 — Backend Prompt (Phase 2/3 hardening & go-live)

> Copy everything below the line into Claude Code as one message. Assumes Stages 11–30 are complete. The closing stage of this folder — re-runs Stage 11's hardening checklist against every module Stages 12–30 added, the same way Stage 10 was meant to validate Phase 1.

---

Read `docs/21-build-guide.md` §8 (Testing Checklist) and `RUNBOOK.md` (written in Stage 11) before starting.

## 1. RBAC audit — Stages 12–30
- Same exercise as Stage 11 §1, scoped to every module added since: Admissions, Timetable, Lesson Notes, Assignments, Resources, Clubs, Consent Forms, Front Desk, CBT, Exam Officer Logistics, Library, Hostel, Transport, HR (core + appraisals), WhatsApp/Push, Digital ID, AI Comments. Confirm every write endpoint has a `@Roles()` guard matching `docs/03-roles-and-permissions.md` §2, and expand the wrong-role e2e sweep to cover a sample from each.
- Specifically re-verify the handful of deliberately-open endpoints added in this folder (`POST /admissions/apply`, `POST /hr/vacancies/:id/apply`) are correctly rate-limited (Stage 11's `@nestjs/throttler` setup) and don't leak more than they're supposed to — an unauthenticated endpoint is the highest-risk surface added in this whole folder, audit it first.

## 2. Data correctness spot-checks — new modules
- Re-verify against live data: payroll PAYE/pension calculations (Stage 26) against a manually computed example, CBT auto-grading (Stage 22) against a manually-scored attempt, the timetable conflict-detection logic (Stage 16) with a deliberately overlapping test case, and the unapproved-boarder-absence escalation (Stage 25) actually firing.

## 3. Observability — new queues
- Stage 11's `/health/detailed` reported queue depth for the queues that existed at the time (report cards, receipts, documents). Confirm it now also reports the offer-letter queue (Stage 12), payslip queue (Stage 26), and any other BullMQ queue added since — a stuck worker on any of these is just as invisible as the original gap Stage 11 closed if it isn't included here too.

## 4. Backups
- Re-run Stage 11's real backup-and-restore test now that the schema has grown substantially (every stage in this folder added new tables) — confirm the restore still completes cleanly and the data matches, and update `RUNBOOK.md` if the restore procedure's timing/steps changed materially with the larger schema.

## 5. Production environment
- Re-review `.env`/`.env.production` for every new secret this folder introduced: WhatsApp BSP credentials, push VAPID keys, Anthropic API key, USSD aggregator credentials if built. Confirm none of them ended up in `/web`'s environment by mistake — every one of them is server-only.

**Done when**: the full e2e test suite (now substantially larger than after Stage 11) passes, the new unauthenticated endpoints are confirmed rate-limited, `/health/detailed` reports on every queue added since Stage 11, a fresh backup-and-restore succeeds against the grown schema, and every new third-party credential is confirmed `/api`-only.
