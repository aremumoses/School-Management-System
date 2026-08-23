# 22 — Implementation Status & Remaining Work

A dashboard-by-dashboard, screen-by-screen audit of what's actually built (verified against the live codebase — `api/src/modules/**`, `api/prisma/schema.prisma`, `web/app/**`, `web/lib/dashboard-config.ts`) versus what each spec doc in this folder calls for. This is not a re-statement of the roadmap's intentions — every line below was checked against real code, not assumed from the plan.

**How to read this doc**: each dashboard section has a table with one row per spec'd screen/capability, a status (✅ DONE / 🟡 PARTIAL / ❌ MISSING), and — for anything not DONE — exactly what's missing and which phase it belongs to per [20-roadmap-phases.md](20-roadmap-phases.md). [`/prompts-remaining`](../prompts-remaining/) (sibling to `/prompts`) turns every ❌/🟡 row below into an actual buildable prompt, stage by stage, in the same backend-then-frontend format as `/prompts`.

**Companion doc, not a replacement**: this file records a point-in-time audit. As `/prompts-remaining` stages get executed, rows here should flip to ✅ — keep this doc in sync rather than letting it go stale.

---

## 0. Cross-cutting status (not tied to one dashboard)

| Item | Status | Notes |
|---|---|---|
| Stage 10 (Hardening, Testing & Go-Live) | ❌ NOT EXECUTED | No Sentry on either service, no `@nestjs/throttler` anywhere, no `RUNBOOK.md`, no `/health/detailed`, no documented backup/restore test, no production-env line-by-line review, no Lighthouse/accessibility audit pass. `app/error.tsx`, `app/not-found.tsx`, and `app/manifest.ts` already exist on the frontend (incidental, from general scaffolding) but the rest of Stage 10's checklist (`docs/21-build-guide.md` §8–9) has not been worked through. |
| Differentiator: Escalating fee reminders (§5/§6 of [16](16-module-communication.md)/[19](19-unique-differentiators.md)) | ✅ DONE | Real, working `FeeRemindersService` with T-7/T-3/due/T+3 thresholds and channel escalation (`api/src/modules/communication/fee-reminders.service.ts`) — confirmed live, not a stub. WhatsApp itself isn't wired up (no BSP integration), EMAIL substitutes as the second channel by design. |
| Differentiator: Affective/psychomotor ratings (§7 of [19](19-unique-differentiators.md)) | ✅ DONE | Native part of the results data model since Stage 5 — `/teacher/class-ratings`. |
| Differentiator: WhatsApp Business API + USSD fallback (§1) | ❌ MISSING | Phase 2 (WhatsApp) / Phase 3 (USSD). No BSP integration anywhere in `communication` module. |
| Differentiator: Offline-first PWA data entry (§2) | ❌ MISSING | Phase 2. No service worker, no IndexedDB queue, no background sync — confirmed absent from `web/`. The app is responsive/mobile-friendly (Phase 1 bar) but not offline-capable. |
| Differentiator: Built-in CBT engine + JAMB practice mode (§3) | ❌ MISSING | Phase 2. See Exam Officer + Teacher + Student sections below — zero CBT backend or frontend anywhere. |
| Differentiator: AI-assisted report card comments (§4) | ❌ MISSING | Phase 3. No AI/LLM integration anywhere in the codebase. |
| Differentiator: Early-warning at-risk flagging (§5) | ❌ MISSING | Phase 2/3. No background job or model for this. |
| Differentiator: Digital ID + QR gate-scan (§8) | ❌ MISSING | Phase 2/3. No QR generation, no Visitor/GatePass models. Tied to Front Desk dashboard (below). |
| Differentiator: One-click external exam body export (§9) | ❌ MISSING | Phase 2. No BECE/WAEC/NECO candidate registration tracking. Tied to Exam Officer dashboard. |
| Differentiator: Bulk migration tooling (§10) | 🟡 PARTIAL | Student bulk import (Stage 3) is real and working. Staff bulk import and historical-scores bulk import do **not** exist — confirmed no matching files in `api/src/modules/staff` or `api/src/modules/scores`. |
| Health & Wellness Records (`docs/02-feature-list.md` §16 — medical bio-data, clinic visit log, immunization tracking) | ❌ MISSING | Not owned by any single dashboard doc (04–13), so it didn't get its own audit section — flagged here instead. Phase 2/3. Stage 25's boarder-specific sick-bay log is a narrow exception scoped only to hostel boarders, not a general student health record; the full §16 module remains a separate, not-yet-staged gap. |

---

## 1. Admin Dashboard ([04-dashboard-school-admin.md](04-dashboard-school-admin.md))

| Screen / Capability | Status | What's missing |
|---|---|---|
| Dashboard Home (KPI cards + quick links) | 🟡 PARTIAL | `/admin/page.tsx` renders a generic placeholder home, not the spec'd KPI cards (student/staff counts, attendance rate, fee collection rate, pending approvals, upcoming events) or quick-link tiles. |
| Admissions (applicant pipeline) | ❌ MISSING | No applicant/admission model or endpoints at all — only direct student creation (`POST /students`) exists, not an apply → review → entrance-exam → shortlist → convert pipeline. |
| Staff Directory + Detail | ✅ DONE | `staff.controller.ts`, `/admin/staff`, `/admin/staff/[id]` — full CRUD, role assignment, teaching assignments. |
| Students Directory + 360° Detail | ✅ DONE | `students.controller.ts`, `/admin/students`, `/admin/students/[id]` — bio-data, attendance, discipline, documents tabs. |
| Classes & Arms Setup | ✅ DONE | `classes.controller.ts`, `/admin/academics/classes`. |
| Subjects & Curriculum Setup | ✅ DONE | `subjects.controller.ts`, `/admin/academics/subjects`. |
| Academic Sessions & Terms | ✅ DONE | `sessions.controller.ts`, `/admin/academics/sessions`. |
| Timetable Builder | ❌ MISSING | No timetable/schedule module anywhere in `api/src/modules`. No conflict detection, no publishing workflow. Affects Admin, Teacher ("My Timetable"), and Student ("Timetable") alike. |
| Lesson Note Approvals | ❌ MISSING | No `LessonNote` model, no controller, no approval queue. Nav item exists, routes to a placeholder. |
| Assessment Structure Setup (Admin-facing) | 🟡 PARTIAL | Backend (`assessment.controller.ts`) is real, but there's no dedicated `/admin/assessment-structure` page for an Admin to configure a term's CA/exam weighting from the UI. |
| Attendance Oversight | ✅ DONE | `/admin/attendance` — school-wide rates, chronic-absenteeism flagging. |
| Result Approval Queue + Broadsheet + Report Card Preview | ✅ DONE | `/admin/results`. |
| Fee Structure Setup (Admin-facing) | 🟡 PARTIAL | `fee-structures.controller.ts` exists and is fully usable from the Bursar dashboard; there's no separate `/admin/fees` page (Admin currently has no first-class fee-structure screen of its own, only read access via Bursar's reports). |
| Communication (broadcast, notices) | ✅ DONE | `/admin/communication`. |
| Calendar & Events | ✅ DONE | `/admin/calendar`. |
| Discipline Case Queue + Detail | ✅ DONE | `/admin/discipline`. |
| Document Approval Queue | ✅ DONE | `/admin/documents`. |
| Analytics & Reports | ❌ MISSING | No `/admin/reports` page and no backend for cross-term trends, subject/teacher performance comparison, or attendance/fee trend charts. Only Bursar's `finance-reports` exists, and it's collection-focused, not the broader school analytics the spec describes. |
| Settings — School Profile | ✅ DONE | `/admin/settings/school`. |
| Settings — Module Toggles | ❌ MISSING | No way to enable/disable Hostel, Transport, Library, CBT modules per school. |
| Settings — Role & Permission UI | ❌ MISSING | The permission matrix is entirely code-based (`@Roles()` decorators); no UI to view or adjust it. |
| Bulk Student Import | ✅ DONE | `/admin/students/import`. |
| Auto-Promotion at Session Rollover | 🟡 PARTIAL | `promotion.controller.ts` has the logic; no Admin UI button to trigger it — must be called directly against the API today. |
| Audit Log Viewing | ❌ MISSING | `AuditLogService` writes records everywhere (confirmed extensively used), but there's no screen anywhere to read them back. |
| Data Exports (rosters, broadsheets, attendance, fees → Excel/PDF) | ❌ MISSING | Everything is view-only on screen; no export endpoints beyond Bursar's CSV/print-to-PDF reports. |

---

## 2. Teacher Dashboard ([05-dashboard-teacher.md](05-dashboard-teacher.md))

| Screen / Capability | Status | What's missing |
|---|---|---|
| My Classes (home) | 🟡 PARTIAL | Generic placeholder home; no "quick switch between classes" widget or teaching-assignment summary at `/teacher`. |
| Attendance Entry | ✅ DONE | `/teacher/attendance` — daily + per-period, deadline-aware. |
| Lesson Notes | ❌ MISSING | No `LessonNote` model/controller/page. No NERDC scheme-of-work mapping, no Pending→Approved→Returned workflow. |
| Score Entry Grid | ✅ DONE | `/teacher/scores` — bulk grid, inline validation, live grade preview, lock-on-submit. |
| Gradebook / Class Performance | ❌ MISSING | No teacher-facing historical-performance view, class average display, or at-risk highlighting. (Exam Officer's broadsheet exists but isn't a teacher screen.) |
| Assignments | ❌ MISSING | No `Assignment`/`AssignmentSubmission` models. No post/submit/grade/feedback workflow anywhere. |
| Resources / E-Library Upload | ❌ MISSING | No `Resource` model. No upload/organize-by-topic capability. |
| CBT Test Builder & Results | ❌ MISSING | No CBT models anywhere (`Question`, `Test`, `Attempt`). Phase 2 per roadmap. |
| Messages | ✅ DONE | `/teacher/messages` — moderated, class/subject-scoped threads. |
| Class Teacher Tools (conduct ratings + form comments) | ✅ DONE | `/teacher/class-ratings`. |
| Leave Requests | ❌ MISSING | No `Leave`/`LeaveRequest` model anywhere (also affects HR dashboard, below). |
| My Timetable | ❌ MISSING | Same root cause as Admin's missing Timetable Builder — no personal-schedule endpoint or page. |

---

## 3. Student Dashboard ([06-dashboard-student.md](06-dashboard-student.md))

| Screen / Capability | Status | What's missing |
|---|---|---|
| Home | ✅ DONE | `/student` |
| Profile | ❌ MISSING (frontend only) | Backend (`GET/PATCH /students/:id`) already supports this — just no `/student/profile` page was ever built. |
| Timetable | ❌ MISSING | Same root cause as Admin/Teacher timetable gap. |
| Attendance | ✅ DONE | `/student/attendance`. |
| Scores & Report Cards | ✅ DONE | `/student/results`. |
| Assignments | ❌ MISSING | No backend exists (see Teacher section). |
| CBT / Online Tests | ❌ MISSING | No backend exists. |
| E-Library / Learning Resources | ❌ MISSING | No backend exists. |
| Notice Board | ✅ DONE | `/student/notices`. |
| Messages | ❌ MISSING | `conversations.controller.ts` explicitly scopes messaging to staff↔guardian — Students are deliberately excluded today, but the spec asks for student↔own-teacher messaging too. |
| Fee Status (read-only) | ❌ MISSING (frontend only) | Backend (`GET /invoices`) already allows student read access — just no `/student/fees` page exists. |
| Discipline Record (read-only, optional per school) | 🟡 PARTIAL | Backend correctly scopes a student to their own incidents; no dedicated frontend page surfaces it (optional per spec, so low priority). |
| Clubs & Activities | ❌ MISSING | No model, no page. |
| Calendar | ✅ DONE | `/student/calendar`. |
| Documents | ✅ DONE | `/student/documents`. |

## 4. Parent Dashboard ([07-dashboard-parent.md](07-dashboard-parent.md))

| Screen / Capability | Status | What's missing |
|---|---|---|
| Home (per-child summary) | 🟡 PARTIAL | Generic placeholder home; spec'd summary cards (attendance/fees/notices snapshot) not confirmed present. |
| Child Switcher | ✅ DONE | Reused across Attendance/Fees/Results pages. |
| Attendance | ✅ DONE | `/parent/attendance`. |
| Fees & Payments (incl. Paystack) | ✅ DONE | `/parent/fees` — Paystack checkout, receipts, balance. |
| Report Cards & Performance Trends | ✅ DONE | `/parent/results`. |
| Messages | ✅ DONE | `/parent/messages`. |
| Notices & Calendar + Event RSVP | ✅ DONE | `/parent/notices`, `/parent/calendar`. |
| Consent Forms (e-sign) | ❌ MISSING | No model, no page — paper-replacement consent workflow doesn't exist. |
| Transport (route/pickup-drop times) | ❌ MISSING | No transport models exist at all (see Hostel & Transport dashboard, below). |
| Pickup Authorization | ❌ MISSING | No model, no page — this is also the parent-facing half of Front Desk's "Pickup Verification" (below); neither side exists. |
| Homework Tracker | ❌ MISSING | Depends on the same missing Assignment model as Teacher/Student. |
| Documents | ✅ DONE | `/parent/documents`. |

---

## 5. Bursar Dashboard ([08-dashboard-bursar.md](08-dashboard-bursar.md), [15-module-fees-payments.md](15-module-fees-payments.md))

| Screen / Capability | Status | What's missing |
|---|---|---|
| Finance Overview (home) | 🟡 PARTIAL | Generic placeholder home, not the KPI-card summary the spec implies. |
| Fee Structure Setup | ✅ DONE | `/bursar/fee-structures` — full CRUD, one-off/recurring/conditional components. |
| Invoices (list/generate/detail) | 🟡 PARTIAL | Backend is fully featured (`invoices.controller.ts`: generate with dry-run, list, detail, discounts) — there is **no `/bursar/invoices` page**; falls through to the generic "Coming Soon" catch-all. |
| Record Payment | ✅ DONE | `/bursar/payments/record` — cash/transfer/POS + Paystack. |
| Receipts | 🟡 PARTIAL | Backend generates PDF receipts via a BullMQ job (`receipt.processor.ts`) and stores the URL — there is **no `/bursar/receipts` page** to list/view/print them; falls through to the catch-all. |
| Defaulters List | ✅ DONE | `/bursar/defaulters`. |
| Installment Plans | 🟡 PARTIAL (Phase 2 depth) | Backend CRUD (`payment-plans.controller.ts`) is real; **no `/bursar/installments` page** exists. |
| Expenses (non-fee ledger) | ❌ MISSING (Phase 2) | No backend, no frontend at all. |
| Financial Reports | 🟡 PARTIAL | `/bursar/reports` covers Phase 1's collection summary + outstanding-by-class/term + payment-method breakdown with CSV/print export. Missing the Phase 2 depth: term-on-term and session-on-session trend comparison, per-fee-component deep analysis. |
| Scholarships / Discounts | 🟡 PARTIAL (frontend only) | Backend (`POST /invoices/:id/discounts`) is real and audit-logged; no dedicated UI screen to apply one — only reachable via direct API call today. |
| Flutterwave (alternate gateway) | ❌ MISSING | Listed as a Phase 1 "or" option alongside Paystack in the roadmap doc's wording, but only Paystack is actually implemented. Treat as low-priority since Paystack alone satisfies the Phase 1 "done when." |

---

## 6. Exam Officer Dashboard ([09-dashboard-exam-officer.md](09-dashboard-exam-officer.md)) & CBT Module ([17-module-cbt-examination.md](17-module-cbt-examination.md))

| Screen / Capability | Status | What's missing |
|---|---|---|
| Overview (home) | 🟡 PARTIAL | Generic placeholder home, not the submission/approval-status dashboard the spec describes. |
| Assessment Structure setup | 🟡 PARTIAL | Backend (`assessment.controller.ts`) is real and shared with Admin — no `/exam-officer/assessment-structure` page exists (same gap noted on the Admin side; one frontend page fixes both). |
| Exam Timetable & Logistics (clash detection, hall/seat allocation) | ❌ MISSING | No backend endpoint or model at all. |
| Invigilation Roster | ❌ MISSING | No backend endpoint or model. |
| Score Collation / Broadsheet | ✅ DONE | `/exam-officer/broadsheet` — arm picker, per-subject submission-status chips, "Send for Approval" action. |
| Result Approval Queue (Exam-Officer-facing) | 🟡 PARTIAL | Backend approval workflow (`approve`/`return`/`publish`) is real; the only approval *screen* today lives under `/admin/results`, not a dedicated Exam Officer one. |
| Transcripts | 🟡 PARTIAL | `TranscriptService` + endpoint are real and already consumed by `/student/results` — no Exam-Officer-facing transcript list/management page exists. |
| Question Bank governance | ❌ MISSING | No `Question`/`QuestionBank` model anywhere. Phase 2. |
| CBT Exam Scheduling | ❌ MISSING | No CBT module at all. Phase 2. |
| External Exam Registration (BECE/WAEC/NECO/JAMB) | ❌ MISSING | No candidate-registration model. Phase 2. |
| Malpractice Log (exam-specific, distinct from general Discipline) | ❌ MISSING | Phase 2. |
| Statistical / Item Analysis | ❌ MISSING | No difficulty/discrimination-index or pass-rate analytics. Phase 2/3. |
| Calendar | ✅ DONE | `/exam-officer/calendar`. |

**CBT engine ([17-module-cbt-examination.md](17-module-cbt-examination.md)) — confirmed entirely absent**, every one of: question bank (multi-type questions, Bloom's-taxonomy tagging, teacher authoring), test assembly (manual + rule-based auto-assembly), anti-cheating (randomization, lockdown, webcam proctoring), student test-taking UI (timer, auto-save, auto-submit), auto-grading + essay routing, offline test packages, JAMB UTME mock-practice mode, and item analysis. All Phase 2 (anti-cheating lockdown/webcam and item analysis are specifically Phase 3 within that). Zero rows of this are partial — it's a clean, self-contained Phase 2 build.

## 7. Librarian Dashboard ([10-dashboard-librarian.md](10-dashboard-librarian.md)) — Phase 2

**Status: scaffolding only, zero feature implementation.** Confirmed via full audit.

| Screen | Status |
|---|---|
| Catalog | ❌ MISSING |
| Circulation | ❌ MISSING |
| Members & Loans | ❌ MISSING |
| Reservations | ❌ MISSING |
| Overdue & Fines | ❌ MISSING |
| Digital Resources | ❌ MISSING |
| Library Analytics | ❌ MISSING |

What exists: nav items in `dashboard-config.ts` (all 7 + Calendar), route shell (`layout.tsx`, generic `page.tsx` home, `[...slug]/page.tsx` → "Coming Soon" placeholder), a real shared Calendar page, and role-based access control (LIBRARIAN role redirects/gates correctly). Zero backend: no `Book`/`Loan`/`Reservation`/`Circulation` Prisma models, no `api/src/modules/library*`.

## 8. Hostel & Transport Dashboard ([11-dashboard-hostel-transport.md](11-dashboard-hostel-transport.md)) — Phase 2

**Status: scaffolding only, zero feature implementation.** Confirmed via full audit.

| Screen | Status |
|---|---|
| Hostel Overview, Room & Bed Allocation, Boarder Roster, Roll-Call, Visitation Log, Inventory | ❌ MISSING (all) |
| Transport Overview, Routes & Stops, Student-Route Assignment, Driver/Conductor Records, Pickup/Drop Attendance, Vehicle Maintenance | ❌ MISSING (all) |
| Calendar | ✅ DONE (shared component) |

What exists: same pattern as Librarian — all 12 nav items wired, route shell, generic home + catch-all placeholder, real Calendar page, correct role-based access for both `HOSTEL_WARDEN` and `TRANSPORT_OFFICER`. Zero backend: no Hostel/Room/Boarder/TransportRoute/Vehicle/Driver models. Note: `attendance.service.ts` has an explicit code comment acknowledging this is a deliberately separate Phase 2 flow, not an oversight.

## 9. HR Dashboard ([12-dashboard-hr-staff.md](12-dashboard-hr-staff.md)) — Phase 2 (+ Phase 3 sub-items)

**Status: scaffolding only, zero feature implementation.** Confirmed via full audit.

| Screen | Status | Phase |
|---|---|---|
| Staff Directory (HR-specific view) | 🟡 PARTIAL | The Admin dashboard's Staff Directory (Stage 2) is real and HR could reuse/extend it, but no HR-specific detail screens exist. |
| Recruitment Pipeline | ❌ MISSING | Phase 2 |
| Leave Requests (+ approvals) | ❌ MISSING | Phase 2 — same root-cause gap as Teacher's Leave Requests screen; one Leave module fixes both. |
| Payroll Run + Payslips | ❌ MISSING | Phase 2 |
| Staff Attendance | ❌ MISSING | Phase 2 — the existing `Attendance` model is student-only (`studentId` required); staff attendance needs its own model, not a reuse. |
| Appraisal Cycles | ❌ MISSING | Phase 3 |
| Training / CPD Log | ❌ MISSING | Phase 3 |
| Disciplinary Records (staff-specific) | ❌ MISSING | Phase 2 — Stage 9's `Incident`/`DisciplinaryAction` models are student-only (`studentId` required); staff discipline needs its own model, not a reuse. |
| Offboarding Checklist | ❌ MISSING | Phase 2 |

What exists: nav items (11, including Calendar), route shell, real shared Calendar page, correct HR_OFFICER role gating. Zero payroll/leave/appraisal/training/recruitment/offboarding models in the schema (44 total models, none HR-specific beyond basic `Staff`/`StaffRole`).

## 10. Front Desk / Security Dashboard ([13-dashboard-front-desk-security.md](13-dashboard-front-desk-security.md)) — Phase 2

**Status: scaffolding only, zero feature implementation.** Confirmed via full audit.

| Screen | Status |
|---|---|
| Gate Overview | ❌ MISSING |
| Visitor Sign-In/Out | ❌ MISSING |
| Gate Pass Issuance | ❌ MISSING |
| Pickup Verification | ❌ MISSING (blocked on Parent's missing Pickup Authorization too — build both halves together) |
| Late Arrival Log | ❌ MISSING |
| Incident Log | ❌ MISSING — **not** the same thing as Stage 9's `Incident` model (that's student-discipline-only, `studentId` required); Front Desk needs its own facility/security incident model |
| Asset Movement Log | ❌ MISSING |
| Prospective Parent Inquiries | ❌ MISSING (Phase 3, correctly out of scope for now) |
| Calendar | ✅ DONE (shared component) |

What exists: all 8 nav items wired in `dashboard-config.ts`, route shell, real shared Calendar page, correct `FRONT_DESK` role gating. Zero backend: no `Visitor`/`GatePass`/`PickupAuthorization`/`AssetMovement` models anywhere in the schema.

---

## Summary punch list (everything ❌ or 🟡, grouped by what one prompt-stage would plausibly build)

This list feeds directly into `/prompts-remaining` — see that folder's `README.md` for the stage breakdown and execution order.

1. **Admin dashboard depth** — KPI home cards, Analytics & Reports screen, Settings (module toggles + role/permission UI), Audit Log viewer, data exports, Admin-facing Fee Structure + Assessment Structure pages, auto-promotion trigger UI.
2. **Admissions pipeline** — applicant → entrance exam → shortlist → convert-to-student workflow (Admin).
3. **Timetable module** — one backend module serving Admin (builder), Teacher (my timetable), Student (my timetable).
4. **Lesson Notes module** — submission + HOD/Admin approval workflow (Teacher + Admin).
5. **Assignments/Homework module** — post, submit, grade, feedback (Teacher, Student, Parent's Homework Tracker all depend on this one module).
6. **Resources / E-Library module** — teacher upload, student browse (Teacher + Student).
7. **Gradebook (teacher-facing class performance view)**.
8. **Bursar invoices + receipts pages** — pure frontend, backend already exists.
9. **Bursar installment plans page** — pure frontend, backend already exists.
10. **Bursar expenses module** — backend + frontend, net new.
11. **Bursar discount-application UI** — pure frontend, backend already exists.
12. **Financial reports Phase 2 depth** — trend comparisons.
13. **Student Profile + Fee Status pages** — pure frontend, backend already exists.
14. **Student↔teacher messaging** — extend the existing Conversations module to allow STUDENT.
15. **Clubs & Activities module**.
16. **Consent Forms module** (Parent).
17. **Pickup Authorization + Front Desk Pickup Verification** — built together, one workflow.
18. **CBT engine** — question bank, test assembly, scheduling, auto-grading, JAMB mock mode (Exam Officer build + Teacher/Student consume).
19. **Exam Officer remaining screens** — Exam-Officer-facing assessment-structure + result-approval + transcript pages (backend already exists for all three, frontend pages don't), plus net-new exam timetable, invigilation roster, external exam (BECE/WAEC/NECO) registration, malpractice log, statistics.
20. **Library module** — full Librarian dashboard.
21. **Hostel & Transport module** — full dashboard, both halves.
22. **HR module (Phase 2 slice)** — recruitment, leave requests, payroll/payslips, staff attendance, staff disciplinary records, offboarding.
23. **HR module (Phase 3 slice)** — appraisals, training/CPD log.
24. **Communication Phase 2/3** — WhatsApp Business API channel, USSD fallback.
25. **PWA depth** — offline-first data entry with background sync (Phase 2), push notifications.
26. **Digital ID + QR gate-scan verification** (ties Front Desk + Student ID together).
27. **AI-assisted report card comments** (Phase 3).
28. **Early-warning at-risk student flagging** (Phase 2/3).
29. **Bulk import for staff and historical scores** (extends the existing Stage 3 student-import pattern).
30. **Stage 10 — Hardening, testing & go-live** — this was never executed for what's already built (Phase 1) and should happen before any Phase 2 work ships to production: Sentry both sides, `@nestjs/throttler` on auth/webhook routes, `RUNBOOK.md` + real backup/restore test, `/health/detailed`, full RBAC wrong-role e2e sweep, Lighthouse/accessibility pass, production env review.
