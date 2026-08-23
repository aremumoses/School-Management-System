# Stage 13 — Frontend Prompt (Admin dashboard depth)

> Copy everything below the line into Claude Code as one message. Assumes this stage's backend prompt is done.

---

Follow `prompts/00-DESIGN-SYSTEM.md` throughout.

## 1. Dashboard home (`/admin`)
- Replace the current generic placeholder home with the spec'd KPI cards (`StatCard` pattern, already used elsewhere — reuse it, don't invent a new card component): student/staff counts, today's attendance rate, fee collection rate, pending result approvals, pending discipline cases, upcoming events — each calling `GET /admin/dashboard-summary`. Add quick-link tiles below: "Record New Admission" (→ `/admin/admissions`), "Broadcast a Notice" (→ `/admin/communication`), "Approve Results" (→ `/admin/results`).

## 2. Analytics & Reports (`/admin/reports`)
- Performance-trend line chart (Recharts, per design system §6) across a session, schoolwide + per-class toggle. Subject-performance bar chart, sortable. Teacher/class-performance comparison (frame this as "classes trending low," matching the backend's careful framing — not a teacher leaderboard). Attendance-trend line chart. Reuse `bursar/reports/page.tsx`'s chart patterns rather than inventing new ones.

## 3. Settings depth (`/admin/settings`)
- Module toggles: a simple list of switches (Hostel, Transport, Library, CBT) calling `PATCH /school/modules`. Note in the UI copy that toggling these off doesn't remove existing data, only hides the nav (relevant once Stages 22–25 exist).
- Role & Permission viewer: a read-only matrix table (role × module → access level) rendered from `GET /roles/permission-matrix`, explicitly labeled read-only with a short explanation of why (per the backend prompt's framing — changing it requires a code change).

## 4. Audit Log viewer (`/admin/audit-log`)
- `DataTable` with filters (entity type, actor, date range), each row showing actor/action/entity/timestamp, expandable to show before/after JSON for that entry.

## 5. Data exports
- Add "Export to Excel" buttons on the Students Directory, Staff Directory, and Attendance Oversight pages (calling the new export endpoints, triggering a file download — same `<a download>` pattern used for receipts/documents elsewhere). Add "Export Broadsheet" next to the existing PDF report-card download on the results/broadsheet view.

## 6. Auto-promotion trigger UI
- A button on `/admin/students` (or a small dedicated `/admin/students/promotion` screen) that calls the dry-run preview, shows the suggested PROMOTED/REPEATED outcome per student in a table, and only commits on explicit confirmation (`AlertDialog`, since this changes every student's enrollment status at once — treat it with the same deliberate-confirmation weight as Stage 9's Suspension/Expulsion approval, not a casual button).

## 7. Admin-facing Fee Structure + Assessment Structure pages
- `/admin/fees` — same `FeeStructureBuilder` component the Bursar dashboard already uses (`app/bursar/fee-structures/fee-structure-builder.tsx`), just mounted under the Admin segment too, since Admin has "F" access per the permissions matrix and currently has no first-class screen of its own.
- `/admin/assessment-structure` — a page to configure a term's CA/Exam component weights (the backend already exists; this fixes both the Admin and Exam Officer gap at once — see Stage 15 for the Exam Officer-side wiring of the same component).

## 8. Bulk import UI
- `/admin/staff/import` — mirror `/admin/students/import`'s wizard exactly (preview table, validation errors surfaced row-by-row, commit step).
- A "Bulk Import Scores" entry point from the Score Entry context (Admin or Exam Officer initiating a historical-data migration, not a regular teacher workflow) — same preview/commit pattern.

**Done when**: every item in `docs/22-implementation-status.md` §1 that isn't Admissions/Timetable/Lesson-Notes now shows ✅, the Admin home's numbers update live as you take actions elsewhere in the app (mark attendance, approve a result), and a real (anonymized) staff spreadsheet imports cleanly through the new wizard.
