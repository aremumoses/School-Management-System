# Stage 16 — Backend Prompt (Timetable)

> Copy everything below the line into Claude Code as one message. Assumes Stages 1–9 and 11 are complete. Closes `docs/22-implementation-status.md`'s Timetable rows across Admin, Teacher, and Student — one module serves all three. `docs/02-feature-list.md` §5 marks the timetable builder itself (P1), so despite being deferred until this far into the build order, it is **not** a Phase 2 item — it was simply never built in Phase 1.

---

Read `docs/04-dashboard-school-admin.md` §4 ("Build/approve the timetable") and `docs/05-dashboard-teacher.md` §12 before starting.

## 1. `TimetableModule`
- `Period` model: a school-wide list of named time slots per day (e.g. "Period 1, Mon–Fri, 8:00–8:40"), Admin-configured once per school (reuse the existing `School` singleton pattern for where this config lives).
- `TimetableEntry` model: `armId`, `classSubjectId` (reuse Stage 2's `ClassSubject`, which already ties a subject to a class and implicitly its assigned teacher via `TeacherAssignment`), `periodId`, `dayOfWeek`, `termId`, optional `room` (free text is fine — no separate Room model needed unless the school's room list turns out to matter for conflict detection, in which case a simple `Room` string list works).
- `POST /timetable/entries` / `PATCH /timetable/entries/:id` / `DELETE /timetable/entries/:id` — `@Roles('ADMIN', 'VICE_PRINCIPAL', 'HOD')`, HOD scoped to their own department's classes (reuse the existing "own dept is currently unscoped, no Department model" pattern already documented in `ClassScopeService`'s comments — don't invent department scoping here that doesn't exist anywhere else in the codebase).
- **Conflict detection**, the core requirement: before creating/updating an entry, reject (400, with a clear message naming the conflicting entry) if the same `armId`+`dayOfWeek`+`periodId` is already taken (the class already has something scheduled then), or if the same teacher (resolved via the entry's `classSubjectId` → `TeacherAssignment`) is already teaching a different arm at that `dayOfWeek`+`periodId`, or if the same `room` (when supplied) is double-booked at that slot. Write this as one shared validation function called by both create and update — a conflict introduced via update is just as real as one introduced via create.
- `GET /timetable/arm/:armId?termId=` — full week grid for one arm (Admin builder view + what a Student/Parent would see for "their" timetable, resolved server-side from the student's current enrollment).
- `GET /timetable/staff/:staffId?termId=` — full week grid for one teacher (their "My Timetable" view), aggregating every arm they're scheduled in.
- A publish/draft state isn't required by the spec text itself, but conflict-checked entries are inherently safe to show live — skip building a separate publish step unless you find the spec implies one elsewhere; don't add ceremony beyond what's asked.

**Done when**: building a full week's timetable for two arms sharing one teacher correctly rejects the double-booking attempt with a specific, actionable error (not a generic 400), `GET /timetable/staff/:staffId` for that teacher shows their classes across both arms correctly merged into one week view, and a student's own timetable resolves correctly from their current enrollment without the caller needing to pass an armId explicitly.
