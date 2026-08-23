# Stage 17 — Backend Prompt (Lesson Notes)

> Copy everything below the line into Claude Code as one message. Assumes Stages 1–9 and 11 are complete. Closes `docs/22-implementation-status.md`'s Lesson Notes rows (Teacher + Admin).

---

Read `docs/05-dashboard-teacher.md` §3 and `docs/04-dashboard-school-admin.md` §4 ("Approve lesson notes... or delegate to HODs") before starting.

## 1. `LessonNoteModule`
- `LessonNote` model: `classSubjectId` (ties to subject+class, same as Score/Timetable), `termId`, week-of-term (integer or date range), topic, NERDC-scheme reference (free text field — "mapped to the NERDC scheme of work" per spec, not a structured curriculum database; don't over-build a curriculum-mapping system that isn't asked for), content (rich text or structured sections — objectives/content/activities/evaluation is the conventional Nigerian lesson-note shape, use that if no stricter spec exists), optional attachment URL, `status` (`PENDING` → `APPROVED` | `RETURNED`), `submittedByStaffId`, reviewer notes on return.
- `POST /lesson-notes` — `@Roles('SUBJECT_TEACHER', 'CLASS_TEACHER', 'HOD')`, validate the caller is actually assigned to that `classSubjectId` (reuse `TeacherAssignment`, same check Stage 5's score submission already does — don't trust the request body for this).
- `GET /lesson-notes?classSubjectId=&termId=&status=` — scoped: a teacher sees their own; HOD/Admin/VP see everything (reuse the existing unscoped-roles pattern from `ClassScopeService`).
- `PATCH /lesson-notes/:id/review` — `@Roles('HOD', 'ADMIN', 'VICE_PRINCIPAL')`, transitions `PENDING` → `APPROVED` or `RETURNED` (with required notes on return).
- `POST /lesson-notes/:id/duplicate` — copies an existing note (typically from a previous term) into a new `PENDING` draft for the current term, same `classSubjectId`, letting the teacher edit from there rather than starting blank. This is the "reuse a previous term's note" requirement — implement it as a real duplicate-and-edit, not a frontend-only copy/paste trick, so the duplicated note still goes through its own approval cycle.

**Done when**: a Subject Teacher can submit a lesson note for a class they're actually assigned to (and is rejected for one they aren't), an HOD can approve or return it with a reason, and duplicating last term's note for the same subject correctly produces a new editable `PENDING` draft rather than silently approving a copy.
