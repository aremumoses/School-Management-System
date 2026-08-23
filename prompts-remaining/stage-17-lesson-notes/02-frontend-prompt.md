# Stage 17 — Frontend Prompt (Lesson Notes)

> Copy everything below the line into Claude Code as one message. Assumes this stage's backend prompt is done.

---

Follow `prompts/00-DESIGN-SYSTEM.md` throughout.

## 1. Teacher Lesson Notes (`/teacher/lesson-notes`)
- A list (class/subject, week, topic, status badge) using the `DataTable` pattern, "New Lesson Note" primary action opening an editor (structured fields: topic, week, NERDC reference, objectives/content/activities/evaluation sections or however the backend modeled it, optional attachment upload). Each existing note row has a "Duplicate" action (calls `POST /lesson-notes/:id/duplicate`, opens the resulting draft in the editor immediately).
- Status badges follow the discipline-style severity-badge convention: `PENDING` = warning, `APPROVED` = success, `RETURNED` = error (paired with the text label, per design system §2's "never color-only" rule).

## 2. Admin/HOD Lesson Note Approvals (`/admin/lesson-notes`)
- An approval queue (`DataTable`: teacher, class/subject, week, topic, status) filtered to `PENDING` by default, detail view showing the full note content, Approve/Return actions (Return requires a reason — reuse the same required-reason `AlertDialog` pattern as Stage 9's discipline rejection and this stage's own backend validation).

**Done when**: a teacher can submit a lesson note for a real class+subject assignment, an Admin can approve or return it with a reason visible back to the teacher, and duplicating a previous note correctly opens a fresh editable draft rather than just re-displaying the old approved one.
