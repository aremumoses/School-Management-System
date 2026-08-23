# Stage 27 — Backend Prompt (HR: Appraisals & Training/CPD)

> Copy everything below the line into Claude Code as one message. Assumes Stage 26 (HR Core) is complete. Closes `docs/22-implementation-status.md` §9's two Phase 3 rows — the smallest, most deferrable pieces of the HR dashboard, intentionally split from Stage 26 since they're genuinely lower-priority per `docs/20-roadmap-phases.md`'s own phase boundary.

---

Read `docs/12-dashboard-hr-staff.md` §6–7 before starting.

## 1. Performance Appraisal
- `AppraisalCycle` model (name, periodStart, periodEnd, status). `AppraisalForm` model (a structured set of rated categories + free-text sections — keep it configurable per school rather than hardcoding one fixed rubric, since "structured forms" in the spec doesn't pin down the exact criteria; a JSON-shaped form definition the school edits once, reused per cycle, mirrors how Stage 5's affective/psychomotor ratings are configurable). `AppraisalSubmission` model (cycleId, staffId, reviewerId, responses JSON, status: `DRAFT` → `SUBMITTED` → `SIGNED_OFF`).
- `POST /hr/appraisal-cycles`, `POST /hr/appraisal-cycles/:id/submissions` (reviewer fills in a staff member's form), `PATCH /hr/appraisal-submissions/:id/sign-off` — `@Roles('HR_OFFICER', 'ADMIN')` for cycle management, reviewer assignment determines who can submit a given staff member's form.
- `GET /hr/staff/:id/appraisal-history` — every past cycle's submission for that staff member, the historical record the spec asks for.

## 2. Training / CPD Log
- `TrainingRecord` model (staffId, title, provider, completedDate, certificateUrl — reuse `StorageService`, hoursOrCredits if the school tracks CPD points). `POST /hr/training-records`, `GET /hr/staff/:id/training-history`.

**Done when**: an appraisal cycle can be created, a reviewer can submit a structured appraisal for a staff member, and the staff member's appraisal history correctly accumulates across multiple cycles; a training record with an uploaded certificate is attached to a staff member and visible in their training history.
