# Stage 22 — Frontend Prompt (CBT & Examination Engine)

> Copy everything below the line into Claude Code as one message. Assumes this stage's backend prompt is done.

---

Follow `prompts/00-DESIGN-SYSTEM.md` throughout, **except where this prompt explicitly calls out an exception** for the exam-mode test-taking screen (§3 below) — per `00-DESIGN-SYSTEM.md` §11, a genuinely different layout for a focused, distraction-free task is a deliberate, named exception, not a drift from the system.

## 1. Teacher Question Bank & Test Builder (`/teacher/cbt`)
- Question bank browser (filter by subject/topic/difficulty/type/status), a question editor (type-specific input — option list for MCQ, true/false toggle, etc., image upload for attachments), submitted for Exam-Officer approval per the backend's governance flow (status badge: Pending/Approved, same warning/success convention used everywhere else).
- Test builder: pick a class+subject, either hand-pick questions from the approved bank or use the rule-based auto-assemble form (topic + difficulty + count rows), set time limit/attempts/availability window/pass mark/instant-release/show-answers-after toggles. List of the teacher's own tests with status (Draft/Scheduled/Open/Closed) and a results/stats view once it has attempts (score distribution chart, average, pass rate — reuse the Recharts pattern from Stage 13's analytics).
- Essay grading queue: for any test with ungraded essay answers, a simple per-student per-question grading form (score + feedback).

## 2. Exam Officer Question Approval (`/exam-officer/question-bank`)
- Approval queue for `PENDING` questions (same approve/return-with-reason pattern as every other approval queue in this build), and the same test-stats view teachers get, but across the whole school rather than just their own tests.

## 3. Student Test-Taking (`/student/cbt`)
- A list of available/upcoming/past tests (status, window, time limit) — this part follows the normal design system.
- **The actual test-taking screen is the named exception**: full-width, minimal chrome (no sidebar, no nav distractions), large always-visible countdown timer, one-question-at-a-time or a question palette (whichever is simpler to build correctly — a question-number grid showing answered/unanswered state is the more standard CBT convention, prefer it if time allows), auto-save indicator (a quiet "Saved" confirmation after each answer, calling `PATCH /cbt/attempts/:id/answers` on every change — debounce reasonably, don't fire one request per keystroke for text answers), and a manual Submit button alongside the time-up auto-submit. Confirm answers are actually persisted by reloading the page mid-test in development and verifying the test resumes with prior answers intact — this is the single most important behavior in this whole stage to get right, more important than visual polish.
- Result view: immediate score if `instantRelease` and fully auto-graded; a clear "awaiting grading" state otherwise.

## 4. JAMB Mock Practice (`/student/cbt` — a separate tab/section, not a separate route)
- A practice-mode entry point using the same test-taking screen, clearly labeled as practice (not feeding real grades), plus a score-trend view (simple line chart) of the student's mock-attempt history over time.

**Done when**: a teacher can auto-assemble and publish a test, a student can take it within the availability window with visibly randomized question/option order versus another student's attempt, refreshing mid-test does not lose any answered questions, the timer correctly force-submits at zero with whatever was answered, essay-containing tests correctly withhold the score until graded, and the mock-practice score trend renders real data after a few practice attempts.
