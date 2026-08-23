# Stage 13 — Backend Prompt (Admin dashboard depth)

> Copy everything below the line into Claude Code as one message. Assumes Stages 1–9, 11, and 12 are complete. Closes the rest of Admin's ❌/🟡 rows in `docs/22-implementation-status.md` §1 that aren't Admissions (Stage 12) or Timetable/Lesson-Notes (Stages 16–17, which Admin also touches but are big enough to be their own stages).

---

Read `docs/04-dashboard-school-admin.md` §1, §9 ("Settings"), and "Data exports" in full before starting.

## 1. Dashboard home KPIs
- `GET /admin/dashboard-summary` — `@Roles('ADMIN', 'VICE_PRINCIPAL')`. Returns: total active students, total active staff, today's school-wide attendance rate (reuse Stage 4's attendance summary logic), current term's fee collection rate (reuse Stage 6's `finance-reports` collection-summary), count of pending result approvals (reuse Stage 5's per-arm status endpoint, aggregated), count of pending discipline cases awaiting Admin approval (Stage 9), count of upcoming events in the next 7 days (Stage 9's calendar). Don't duplicate the underlying computation — call the existing services, just assemble one summary DTO.

## 2. Analytics & Reports
- `AnalyticsModule`: `GET /analytics/performance-trends?sessionId=` — average score per term across a session, schoolwide and per-class, for a simple trend line. `GET /analytics/subject-performance?termId=` — average score per subject, sortable, to spot a subject's class-wide weak spot. `GET /analytics/teacher-performance?termId=` — average score per class+subject grouped by the assigned teacher (read-only aggregate, not an individual performance review tool — careful with how this is framed, it's "which classes are trending low," not "rank the teachers"). `GET /analytics/attendance-trends?sessionId=` — attendance rate per term across a session. Reuse existing Score/Result/Attendance tables — this is read-only aggregation, no new core data model.

## 3. Data exports
- `GET /students/export` (Excel, current filtered roster — reuse Stage 3's query-students filtering, just change the response format), `GET /staff/export` (Excel), `GET /results/:armId/:termId/broadsheet/export` (Excel + the existing PDF already covers the other format), `GET /attendance/export?classId=&from=&to=` (Excel). Use a lightweight library (e.g. `exceljs`) consistent with the existing PDF-via-Puppeteer pattern elsewhere — these are small enough to render synchronously, no queue needed.

## 4. Settings — module toggles
- Add a `enabledModules: String[]` (or a small `ModuleToggle` table, simpler is fine) field on `School`. `PATCH /school/modules` — `@Roles('ADMIN')`, toggles `HOSTEL`, `TRANSPORT`, `LIBRARY`, `CBT` on/off. This doesn't need to gate API access yet (those modules don't exist until Stages 22–25 build them) — it just needs to exist now so the frontend's sidebar can hide nav items for modules a given school doesn't run, once those stages ship.

## 5. Settings — role & permission visibility
- `GET /roles/permission-matrix` — `@Roles('ADMIN')`, read-only endpoint that returns the actual `@Roles()` matrix already enforced in code (introspect the existing decorators, or maintain one source-of-truth config object the guards already read from, and just expose it) — this is a **read-only mirror** of what's already enforced, not a new permission engine. Don't let the frontend write to this; the matrix changing requires a code change and redeploy, by design, per `docs/03-roles-and-permissions.md`'s own framing.

## 6. Audit log viewing
- `GET /audit-log?entityType=&actorId=&from=&to=` — `@Roles('ADMIN')`, paginated read over the existing `AuditLog` table (already written to extensively by every module since Stage 1 — confirm via `AuditLogService` usage — this stage only adds the read path).

## 7. Auto-promotion trigger
- Confirm `POST /promotion/auto-promote` (Stage 5) already exists and is correctly guarded — this stage is frontend-only for that piece (see the frontend prompt), no backend change needed unless the existing endpoint is missing a dry-run preview mode, in which case add one (`?dryRun=true` returning the suggested outcome list without committing).

## 8. Admin-facing Fee Structure + Assessment Structure
- No new backend needed — `fee-structures.controller.ts` and `assessment.controller.ts` already exist and are role-agnostic enough for Admin to call them too; confirm their `@Roles()` already include `ADMIN` (they should, since Admin has "F" on both per the permissions matrix) and widen if not.

## 9. Bulk import — staff and historical scores
- `POST /staff/bulk-import` — same Excel-template pattern as Stage 3's student bulk import (preview/validate → commit), for onboarding an existing staff roster.
- `POST /scores/bulk-import` — same pattern, scoped to one class+subject+term at a time (matching the shape `POST /scores/submit` already expects), for migrating a school's existing CA/exam records during initial setup. Validate against the term's assessment-component max scores exactly like `POST /scores/submit` does — don't bypass that validation just because it's a bulk path.

**Done when**: the Admin home shows real numbers (not placeholder text) that match a manual count against seed data, all four exports produce real Excel files openable in actual Excel, the audit log endpoint returns real historical entries from actions taken in earlier stages, and a staff roster + a class's historical CA scores can both be bulk-imported from realistic (not synthetic-clean) spreadsheets.
