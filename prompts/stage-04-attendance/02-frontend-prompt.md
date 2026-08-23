# Stage 4 — Frontend Prompt (Attendance screens)

> Copy everything below the line into Claude Code as one message. Assumes Stage 4's backend endpoints already exist.

---

Read `docs/05-dashboard-teacher.md` §2, and follow `prompts/00-DESIGN-SYSTEM.md` for every visual decision.

## 1. Teacher: mark attendance (`/teacher/attendance`)
- A class/date picker at the top (class limited to this teacher's assignments). Below it, a roster list: each student's photo + name + a 4-way segmented control (Present/Absent/Late/Excused) defaulting to Present for everyone — per `docs/05-dashboard-teacher.md` §2, the realistic flow is "mark exceptions," not "tap every student individually."
- A prominent "Mark All Present" button above the list that sets every control at once, so a teacher with a fully-present class can submit in two taps.
- Save button shows a brief success toast and the page should feel instant — use an optimistic update (per `00-DESIGN-SYSTEM.md` §7) so tapping a status reflects immediately, with a quiet rollback + toast only if the save actually fails.

## 2. Admin: attendance dashboard (`/admin/attendance`)
- A school-wide summary (today's attendance rate as a large stat, a simple bar chart of attendance rate by class), and a "Chronic Absenteeism" card listing flagged students (name, class, absence rate, a "View" link to their profile) — calls the chronic-absenteeism endpoint with a sensible default threshold, adjustable via a small control.

## 3. Parent/Student: attendance history (`/parent/attendance`, `/student/attendance`)
- A simple, calm view: this term's summary (present/absent/late counts + percentage as a small set of stat cards using `success`/`warning`/`error` colors appropriately), below it a compact calendar-style view or list of the term's daily records. Keep this lightweight — it's one of the most-opened screens by anxious parents, so it should load fast and read clearly at a glance, even on a slow connection.

**Done when**: a teacher can mark a full class in well under a minute on a phone, the Admin dashboard's chronic-absenteeism list correctly reflects a flagged test student, and a parent can see an accurate attendance summary for their child that matches what the teacher actually marked.
