# Stage 26 — Backend Prompt (HR Core: recruitment, leave, payroll, staff attendance, staff discipline, offboarding)

> Copy everything below the line into Claude Code as one message. Assumes Stages 1–9 and 11 are complete. Closes `docs/22-implementation-status.md` §9's Phase 2 rows. This is a large, mostly-standalone stage — take it slowly, the same advice given for Stage 5 and Stage 22. **Crucial distinction to hold onto throughout**: the existing `Staff`/`StaffRole` tables (Stage 2) cover *academic* role/assignment data Admin manages; everything in this stage is a *separate, additive* HR layer keyed off the same `staffId`, not a replacement or a duplicate of those tables.

---

Read `docs/12-dashboard-hr-staff.md` in full before starting.

## 1. Staff records depth (§1)
- Extend what Stage 2's `Staff` model doesn't already cover: `StaffEmploymentRecord` (next of kin, qualifications array, department, bank account details — split into its own table rather than bloating `Staff` directly, since this is HR-owned data Admin's existing staff screens shouldn't need to render). `StaffDocument` model (CV/certificate/ID/contract, reusing `StorageService` exactly like every other document upload in this build). `POST /hr/staff/:id/employment-record`, `POST /hr/staff/:id/documents` — `@Roles('HR_OFFICER', 'ADMIN')`.

## 2. Recruitment pipeline (§2)
- `JobVacancy` model (title, description, postedAt, closesAt, status). `Candidate` model (name, contact, resume URL, vacancyId, stage: `APPLIED` → `SHORTLISTED` → `INTERVIEWED` → `OFFERED` → `HIRED` | `REJECTED`). `POST /hr/vacancies`, `POST /hr/vacancies/:id/apply` (this can be public/unauthenticated, same reasoning as Stage 12's admissions form — a candidate has no account yet), `PATCH /hr/candidates/:id/stage`. `POST /hr/candidates/:id/convert-to-staff` — `@Roles('HR_OFFICER', 'ADMIN')`, only from `HIRED`, creates the real `Staff` record (reuse Stage 2's staff-creation path, including its temporary-password convention — don't duplicate that logic).

## 3. Leave management (§3)
- `LeaveType` model (Annual/Sick/Maternity/Paternity/Compassionate — a small fixed reference table, school-configurable defaults). `LeaveBalance` model (staffId, leaveTypeId, year, allocatedDays, usedDays). `LeaveRequest` model (staffId, leaveTypeId, fromDate, toDate, reason, status: `PENDING` → `APPROVED` | `REJECTED`, decidedByStaffId).
- `POST /hr/leave-requests` — `@Roles()` (any staff role, this is self-service — a Teacher submits their own, same as the spec's sample workflow). Validate against remaining `LeaveBalance` for that type/year (warn but don't hard-block if the school wants to allow exceeding balance — flag it clearly in the response either way, let HR decide).
- `PATCH /hr/leave-requests/:id/decide` — `@Roles('HR_OFFICER', 'ADMIN')`. On approval, decrement the relevant `LeaveBalance` and — per the spec's sample workflow — flag the covered date range on the teacher's `TimetableEntry` view (if Stage 16 exists) so Admin can see "this teacher is out, arrange cover" — a read-side join, not a new write to the timetable itself.
- This single module fixes **both** the HR dashboard's Leave Requests screen and Teacher's identically-named, identically-missing screen from `docs/22-implementation-status.md` §2 — one backend, two frontend consumers (see the frontend prompt).

## 4. Payroll (§4)
- `SalaryStructure` model (role/grade level, basic, housing, transport, other allowances — JSON or a few typed columns, whichever is simpler given the school likely has a handful of grade levels, not hundreds). `PayrollRun` model (month, year, status: `DRAFT` → `REVIEWED` → `APPROVED`). `Payslip` model (payrollRunId, staffId, grossPay, payeDeduction, pensionDeduction, otherDeductions, netPay, pdfUrl).
- A `TaxCalculationService` implementing current Nigerian PAYE brackets and pension (typically 8% employee contribution under the Pension Reform Act, but **make the rates/brackets school-configurable, not hardcoded constants** — tax law changes, and hardcoding a snapshot that silently goes stale is worse than requiring an explicit config value with today's correct default).
- `POST /hr/payroll/runs` — `@Roles('HR_OFFICER', 'ADMIN')`, computes every active staff member's pay for the month against their `SalaryStructure`, status starts `DRAFT`. `PATCH /hr/payroll/runs/:id/approve` — generates payslip PDFs (reuse the Puppeteer+BullMQ+StorageService pattern, same shape as report cards/receipts/documents) and exports a bank-payment-schedule CSV (staff bank details + net pay, in a generic column layout a Nigerian bank's bulk-upload portal could plausibly accept — note in a comment that the *exact* required format varies by bank and should be confirmed against the school's actual bank before relying on it for a real disbursement).

## 5. Staff attendance (§5)
- `StaffAttendance` model (staffId, date, clockIn, clockOut) — **deliberately a new model**, not a reuse of Stage 4's `Attendance` (that one is `studentId`-required, confirmed by the audit). `POST /hr/staff-attendance/clock-in`, `POST /hr/staff-attendance/clock-out` — `@Roles()` (self-service, any staff role), `GET /hr/staff-attendance?staffId=&from=&to=` — `@Roles('HR_OFFICER', 'ADMIN')` for others, self for own record.

## 6. Disciplinary records (§8)
- `StaffDisciplinaryRecord` model (staffId, description, actionTaken, `loggedByStaffId`, `loggedAt`) — **deliberately separate from Stage 9's student `Incident`** (same reasoning Stage 21/23/25 already applied to their own non-student incident logs — by now this is an established, consistent pattern across the whole build, not a one-off). `POST /hr/disciplinary-records`, `GET /hr/disciplinary-records?staffId=` — `@Roles('HR_OFFICER', 'ADMIN')`.

## 7. Offboarding (§9)
- `OffboardingChecklist` model (staffId, initiatedAt, items: a small fixed or configurable checklist — handover confirmed, assets returned, final pay computed — each with a completed boolean + completedAt), finalPayAmount. `POST /hr/offboarding`, `PATCH /hr/offboarding/:id` (toggle checklist items), and on full completion, set the underlying `Staff.isActive = false` (reusing Stage 1's existing deactivation behavior — confirm refresh-token revocation already fires on that flag flip, per Stage 10/11's hardening checklist item about deactivation immediately revoking access; if it doesn't already, fix it here since this is exactly the workflow that depends on it).

## 8. Notifications & exports
- Wire the spec's "Notifications received": new leave request pending, payroll run ready for review, staff document/contract nearing expiry (a scheduled check against any `StaffDocument` with an expiry date, reusing the same `@nestjs/schedule` pattern as every other due-date alert in this build).
- `GET /hr/staff/export`, `GET /hr/payroll/runs/:id/payslips/export` (bulk), `GET /hr/payroll/runs/:id/bank-schedule/export`, `GET /hr/leave-balances/export`.

**Done when**: a posted vacancy accepts a public application and a hired candidate converts cleanly into a real staff login; a teacher's leave request, once approved, correctly shows as covered on their timetable view and decrements their leave balance; a full payroll run for a month of seeded staff computes PAYE/pension correctly against the configured brackets, generates real payslip PDFs, and exports a usable bank schedule; staff clock-in/out is tracked entirely independently of student attendance; and completing an offboarding checklist actually deactivates the staff member's login, verified by confirming their refresh token no longer works afterward.
