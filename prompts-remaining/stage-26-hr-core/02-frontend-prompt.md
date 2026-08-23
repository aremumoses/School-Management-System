# Stage 26 — Frontend Prompt (HR Core)

> Copy everything below the line into Claude Code as one message. Assumes this stage's backend prompt is done.

---

Follow `prompts/00-DESIGN-SYSTEM.md` throughout.

## 1. Staff Directory depth (`/hr`, replacing the placeholder home; detail additions to the existing `/admin/staff/[id]` or a parallel `/hr/staff/[id]`)
- Whichever route you extend, add tabs/sections for: employment record (next of kin, qualifications, department, bank details), documents (upload/list CV/certificates/ID/contract). If `/admin/staff/[id]` already has a tabbed layout (it does, per Stage 2/3's established pattern), add HR's tabs there rather than forking a second staff-detail page — one staff profile, more tabs, not two competing screens.

## 2. Recruitment Pipeline (`/hr/recruitment`)
- Vacancy list + create form. Per-vacancy candidate pipeline (Kanban-style columns matching the backend's stage enum, or a simpler filtered `DataTable` if a Kanban is more than this needs — pick whichever reads more clearly, don't force a drag-and-drop board if a status-filtered table does the job). "Convert to Staff" action on a `HIRED` candidate.

## 3. Leave Requests — both consumers of one backend
- `/hr/leave` — HR's approval queue (`DataTable`: staff, leave type, dates, status), approve/reject-with-reason.
- `/teacher/leave` — the **same** self-service submit-and-track screen, mounted under the Teacher segment (a simple form + the staff member's own request history + remaining balance). Since this is genuinely the same component (any staff role submits leave the same way), build one `LeaveRequestForm`/`MyLeaveRequests` component pair and mount it at both routes, rather than writing it twice.

## 4. Payroll (`/hr/payroll`, `/hr/payslips`)
- Salary structure setup (per role/grade). Run payroll: month picker, a review table (gross/PAYE/pension/net per staff) before approving, an Approve button (treat this with deliberate-confirmation weight — it generates real payslips and a bank file — same `AlertDialog` pattern as Stage 9's irreversible-action confirmations, not a casual click). Payslip list/download per staff, bulk export, bank-schedule export.

## 5. Staff Attendance (`/hr/attendance`)
- A simple clock-in/clock-out widget (could live on every staff dashboard's home as a small persistent control, or just under `/hr/attendance` for now — keep it simple) and an HR-facing report (`DataTable`, filterable by staff/date range).

## 6. Disciplinary Records (`/hr/disciplinary`)
- Form + list, visually distinct from `/admin/discipline` (same reasoning as every other non-student incident log built in this folder).

## 7. Offboarding (`/hr/offboarding`)
- A checklist UI per departing staff member (handover/assets/final-pay toggles), final-pay amount entry, a clear "Complete Offboarding" action that's explicit about deactivating the staff login (deliberate confirmation, same weight as payroll approval above).

**Done when**: every HR nav item resolves to a real page, a candidate can be hired and converted into a working staff login through the UI, a teacher can submit and track their own leave request from `/teacher/leave` while HR approves it from `/hr/leave`, and a full payroll run can be reviewed and approved with real payslips downloadable afterward.
