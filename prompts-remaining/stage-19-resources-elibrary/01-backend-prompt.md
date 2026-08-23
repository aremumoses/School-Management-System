# Stage 19 — Backend Prompt (Resources / Digital E-Library)

> Copy everything below the line into Claude Code as one message. Assumes Stages 1–9 and 11 are complete. Closes `docs/22-implementation-status.md`'s Resources/E-Library rows (Teacher + Student). Scope note: this is **teacher-uploaded digital content** (notes/slides/past-questions/video links) only — the *physical* library catalog/circulation/loans system `docs/06-dashboard-student.md` §7 also mentions ("view borrowing status of physical books, if library module enabled") is Stage 24's job, not this one. Don't build a Book model here.

---

Read `docs/05-dashboard-teacher.md` §7 and `docs/06-dashboard-student.md` §7 before starting.

## 1. `ResourcesModule`
- `Resource` model: title, subject + topic (free text, or reuse Stage 2's `Subject` relation for the subject field at least — don't invent a parallel subject list), type (`NOTE` | `SLIDES` | `PAST_QUESTION` | `VIDEO_LINK`), either a file URL (uploaded via `StorageService`, same pattern as every other document upload in this codebase) or an external link (for video — don't force a video upload, a YouTube/Vimeo link is the realistic case), `classId`/`armId` scope (which class(es) can see it — a subject's resource is usually shared with every arm at that level, not just one), `uploadedByStaffId`.
- `POST /resources` — `@Roles('SUBJECT_TEACHER', 'CLASS_TEACHER', 'HOD')`, validated against `TeacherAssignment` (same ownership check as Lesson Notes/Assignments — by now this is a well-established pattern in this codebase, reuse it consistently rather than writing a fifth slightly-different version).
- `GET /resources?classId=&subjectId=&type=` — for teachers, their own uploads; for students, resources scoped to their current enrollment's class across all subjects, filterable by subject/topic/type.
- `DELETE /resources/:id` — uploader or unscoped role only.

**Done when**: a teacher can upload a PDF of class notes and a separate video link for the same subject, both scoped to a specific class, and a student in that class can browse and filter by subject/topic while a student in a different class cannot see them.
