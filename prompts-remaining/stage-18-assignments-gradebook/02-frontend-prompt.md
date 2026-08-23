# Stage 18 — Frontend Prompt (Assignments, Homework & Gradebook)

> Copy everything below the line into Claude Code as one message. Assumes this stage's backend prompt is done.

---

Follow `prompts/00-DESIGN-SYSTEM.md` throughout — §9's mobile-first rule applies directly to §2–3 below.

## 1. Teacher Assignments (`/teacher/assignments`)
- List of posted assignments (class/subject, title, due date, submission count) using the `DataTable` pattern, "New Assignment" form (title, instructions, due date, optional attachment, late-submission toggle). Detail view per assignment showing the submissions list with a grade+feedback form per student (text response inline, file submissions linked for download).

## 2. Student Assignments (`/student/assignments`)
- List of assignments for the student's own subjects, due-date-sorted, status badge (Not Submitted / Submitted / Graded). Detail view: instructions + attachment, a submission form (text and/or file upload, disabled past the deadline unless late submission is allowed — show the deadline clearly either way), and once graded, the grade + feedback.

## 3. Parent Homework Tracker (`/parent/homework`)
- Per-child (reuse `ChildSwitcher`) list of that child's assignments and submission/grading status — read-only, no submit action here (submission stays student-only).

## 4. Teacher Gradebook (`/teacher/gradebook`)
- Class+subject picker, then: a score-history table (student × term), class average/highest/lowest stat cards, a simple distribution bar chart (Recharts, per design system §6), and at-risk students visually flagged (reuse the `error`/`warning` badge convention, paired with a text label per §2's "never color-only" rule) — not just silently filtered out, since the point is for the teacher to *see* them.

**Done when**: a teacher can post an assignment, a student can submit it (and is blocked after the deadline unless late submission was explicitly allowed), the teacher can grade it, the parent sees the same submission/grading status for their child without a submit button, and the gradebook's at-risk flagging visibly highlights a student whose seeded scores trend below the configured threshold.
