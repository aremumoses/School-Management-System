# Stage 4 — Backend Prompt (Attendance)

> Copy everything below the line into Claude Code as one message. Assumes Stages 1–3 are complete.

---

Read `docs/05-dashboard-teacher.md` §2 and `docs/02-feature-list.md` §6 before starting.

Build an `AttendanceModule` in `/api`:

## 1. Marking
- `POST /attendance/mark` — accepts `{ classSubjectId or classArmId, date, entries: [{ studentId, status }] }` where `status` is one of `PRESENT/ABSENT/LATE/EXCUSED/ON_LEAVE`. Guard with `@Roles('SUBJECT_TEACHER', 'CLASS_TEACHER')`, and validate the caller is actually assigned to that class (reuse the `TeacherAssignment` check pattern from Stage 2/3). Upsert — marking the same class/date twice updates rather than duplicates.
- Support marking a whole class present in one call (a "mark all present, then adjust exceptions" pattern is the realistic classroom workflow — don't force one-row-at-a-time only).

## 2. Reading
- `GET /attendance?studentId=&from=&to=` — a student's attendance history.
- `GET /attendance/class/:classArmId?date=` — a class's attendance for a given day.
- `GET /attendance/summary?studentId=&termId=` — aggregated counts (present/absent/late/excused, and a percentage) for the report card (Stage 5 will consume this).
- `GET /attendance/chronic-absenteeism?termId=&threshold=` — list of students whose absence rate exceeds the threshold, for the Admin dashboard.

## 3. Side effects
- On marking a student `ABSENT` or `LATE`, **emit an internal event** (e.g. Nest's `EventEmitter2`, or enqueue a BullMQ job if you've already stood up Redis) rather than calling a notification service directly — Stage 7 will subscribe to this event to send the real SMS/push. For now, just log the event clearly so it's obviously wired up and ready, even though no real message sends yet.

Guard reads per `docs/03-roles-and-permissions.md` §2 ("Attendance" row): Admin/VP see everything, Class Teacher their own class, Subject Teacher their own period's records, Student/Parent only their own/their ward's.

**Done when**: a Teacher can mark a full class's attendance for a day in one request, the per-student summary endpoint produces correct present/absent/late counts and percentage, the chronic-absenteeism endpoint correctly flags a seeded student you've deliberately given a low attendance rate, and the absence event is visibly emitted/logged on every ABSENT/LATE mark.
