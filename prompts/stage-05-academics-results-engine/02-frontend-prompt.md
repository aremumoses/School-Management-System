# Stage 5 — Frontend Prompt (Score entry, broadsheets, report cards)

> Copy everything below the line into Claude Code as one message. Assumes Stage 5's backend endpoints already exist. This is the most data-dense, most-scrutinized part of the whole app — typographic clarity and correctness matter more here than anywhere else.

---

Read `docs/05-dashboard-teacher.md` §4, `docs/09-dashboard-exam-officer.md`, `docs/04-dashboard-school-admin.md` §6, `docs/06-dashboard-student.md` §4, `docs/07-dashboard-parent.md` §4, and `docs/14-module-academic-results.md` §6 (the exact report card layout). Follow `prompts/00-DESIGN-SYSTEM.md` throughout.

## 1. Teacher: score entry (`/teacher/scores`)
- Class+subject picker (limited to this teacher's assignments). Below it, a spreadsheet-style grid (TanStack Table): rows = students (photo + name, sticky first column), columns = this term's assessment components, each cell an inline numeric input with live validation (red outline + tooltip if over max). A computed **Total** and **Grade** column updates live as scores are entered, with the grade rendered as a small colored badge (use `secondary`/`warning`/`error` bands sensibly — e.g. A-range in `secondary`, failing in `error`).
- A persistent "Submit" button, disabled until every cell is filled or explicitly marked exempt; on submit, show a confirmation dialog ("You won't be able to edit after submitting unless an Exam Officer unlocks it — submit final scores for {class} {subject}?") since this is a one-way action from the teacher's side.
- Once locked, the grid becomes read-only with a clear "Submitted — awaiting collation" banner.

## 2. Class Teacher: ratings & comment (`/teacher/class-ratings`)
- Only visible to staff holding the Class Teacher role for a class. A per-student form: affective/psychomotor rating controls (whatever scale the school configured — render as a clean segmented control or star-style rating, not a raw dropdown) and a comment textarea. Show a consolidated read-only summary of all subject scores for the class above the form, so the teacher can write an informed comment without switching screens.

## 3. Exam Officer: broadsheet & approval (`/exam-officer/broadsheets`)
- A class+term picker showing real-time submission status per subject (a small grid of subject chips, each colored by status: not started/in progress/submitted) so the Exam Officer can see at a glance what's outstanding.
- Once complete, the **broadsheet** itself: a wide, dense table (subject columns × student rows, horizontally scrollable on smaller screens with a sticky student-name column), grades as colored badges, with the overall position column highlighted. A "Send for Approval" action.

## 4. Admin: approval & publish (`/admin/results/approve`)
- The same broadsheet view, read-only, plus a Principal's Comment field per student (with a "fill smart defaults by performance band" helper button that pre-fills a reasonable starting comment per student based on their grade band — Admin always reviews/edits before it's saved, never auto-published unedited). "Approve & Publish" and "Return for Correction" (with a required reason) actions.

## 5. Student/Parent: report card (`/student/report-card`, `/parent/report-card`)
- An on-screen preview that visually mirrors the PDF layout from `docs/14-module-academic-results.md` §6 as closely as practical in HTML/CSS (subject table, ratings, comments, attendance summary), with a clear "Download PDF" button once it's actually generated. Include a simple performance-trend chart (Recharts line chart, per `00-DESIGN-SYSTEM.md` §6) showing this student's aggregate score across the last few terms, if more than one term's data exists.
- Until results are published for the current term, show a calm "Not yet published" state with the expected publish window if known — never a broken/empty-looking screen.

**Done when**: a complete term-end cycle has been clicked through end-to-end as a human in the browser — multiple teacher logins entering scores, class teacher ratings, exam officer collation, admin approval/publish, and a parent successfully viewing and downloading a correct, well-formatted report card PDF — and every screen above still looks intentional and readable on a 375px mobile viewport, including the broadsheet (horizontal scroll, not a squished mess).
