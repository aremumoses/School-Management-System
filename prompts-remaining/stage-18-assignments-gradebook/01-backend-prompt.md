# Stage 18 — Backend Prompt (Assignments, Homework & Gradebook)

> Copy everything below the line into Claude Code as one message. Assumes Stages 1–9 and 11 are complete. Closes `docs/22-implementation-status.md`'s Assignments rows across Teacher/Student/Parent (one module, three consumers — Parent's "Homework Tracker" is a read view of the same `AssignmentSubmission` data, not a separate model) plus Teacher's Gradebook row (a read-only aggregation, not a new content type).

---

Read `docs/05-dashboard-teacher.md` §5–6, `docs/06-dashboard-student.md` §5, and `docs/07-dashboard-parent.md` §11 before starting.

## 1. `AssignmentsModule`
- `Assignment` model: `classSubjectId`, title, instructions, dueDate, optional attachment URL, `createdByStaffId`.
- `AssignmentSubmission` model: `assignmentId`, `studentId`, submitted content (text and/or file URL), `submittedAt`, `grade` (nullable until graded), `feedback` (nullable), `gradedAt`, `gradedByStaffId`.
- `POST /assignments` — `@Roles('SUBJECT_TEACHER', 'CLASS_TEACHER')`, validated against `TeacherAssignment` like every other teacher-authored content in this codebase (Lesson Notes, Scores) — don't trust the request body for which class/subject the caller may post to.
- `GET /assignments?classSubjectId=` (teacher's own), `GET /assignments` scoped to the logged-in student (their enrolled arm's subjects) or the logged-in guardian's children (aggregate across all linked students) — reuse the existing student/guardian scoping pattern from `IncidentsService`/`DocumentsService`, don't write a fourth version of it.
- `POST /assignments/:id/submit` — `@Roles('STUDENT')`, rejects after `dueDate` unless the assignment is explicitly configured to allow late submission (a simple boolean is enough, default false).
- `PATCH /assignments/:id/submissions/:submissionId/grade` — `@Roles('SUBJECT_TEACHER', 'CLASS_TEACHER')`, same assignment-ownership check as creation.
- On `POST /assignments` and again at a configurable "due soon" point (a simple cron check, e.g. 24h before `dueDate`, reusing Stage 7's `@nestjs/schedule` pattern already established by `FeeRemindersService`), trigger a notification to enrolled students/guardians via the existing `BroadcastsService` — add `ASSIGNMENT_POSTED` and `ASSIGNMENT_DUE_SOON` system templates, don't hand-roll a new send path.

## 2. Gradebook (read-only aggregation, no new model)
- `GET /classes/:classSubjectId/gradebook?sessionId=` — `@Roles('SUBJECT_TEACHER', 'CLASS_TEACHER', 'ADMIN')`, aggregates existing `Score` records across every term in the given session for that class+subject: per-student score history, class average, highest/lowest, and a simple distribution bucket count (e.g. score-range → count of students). Flag students whose average sits below a configurable threshold (reuse the same kind of threshold config pattern Stage 4's chronic-absenteeism flagging already uses — don't invent a second threshold-config mechanism).

**Done when**: a teacher can post an assignment to a class they're actually assigned to, a student in that class can submit before the deadline and is rejected after it (unless late submission is explicitly allowed), the teacher can grade it with feedback the student/parent can then see, a due-soon notification fires on schedule, and the gradebook endpoint returns a correct multi-term average/distribution that matches a manual check against seeded score data.
