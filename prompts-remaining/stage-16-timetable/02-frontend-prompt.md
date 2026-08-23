# Stage 16 — Frontend Prompt (Timetable)

> Copy everything below the line into Claude Code as one message. Assumes this stage's backend prompt is done.

---

Follow `prompts/00-DESIGN-SYSTEM.md` throughout.

## 1. Admin Timetable Builder (`/admin/timetable`)
- Arm picker, then a week×period grid (days as columns, periods as rows — or vice versa, whichever reads cleaner at 375px since this also needs to degrade to mobile per the design system, even though it's a staff-segment screen accessed mostly on desktop). Click an empty cell to assign a `ClassSubject` (dropdown of subjects taught to that arm this term, per Stage 2's existing class-subject mapping) — submitting calls `POST /timetable/entries` and surfaces the backend's specific conflict error inline (not a generic toast) if rejected, naming exactly what's double-booked the way the backend prompt specifies.
- Click an occupied cell to edit/remove.

## 2. Teacher "My Timetable" (`/teacher/timetable`)
- Read-only week grid for the logged-in teacher, calling `GET /timetable/staff/:staffId`, showing which arm/subject/room each period is.

## 3. Student "Timetable" (`/student/timetable`)
- Read-only week grid for the logged-in student's current arm, calling `GET /timetable/arm/:armId`. Design-system §9 mobile-first applies directly here — this is a Student-segment screen, 375px is the primary target; consider a day-by-day list view as the default on small screens (same grid-vs-list pattern Stage 9's Calendar already established) rather than cramming a 5-day grid into a phone width.

## 4. Nav wiring
- Confirm `{ label: 'Timetable', href: '/admin/timetable' }`, `'My Timetable'` (Teacher), and `'Timetable'` (Student) nav entries already exist in `dashboard-config.ts` (per `docs/22-implementation-status.md` they're configured but dead) and now resolve to real pages.

**Done when**: an Admin can build a conflict-free week timetable for two arms sharing a teacher, that same teacher's `/teacher/timetable` correctly shows both arms merged into one week, and a student in one of those arms sees exactly their own class's schedule at `/student/timetable` — verified on an actual 375px-wide viewport, not just a resized desktop browser.
