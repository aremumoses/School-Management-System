# Stage 22 — Backend Prompt (CBT & Examination Engine)

> Copy everything below the line into Claude Code as one message. Assumes Stages 1–9 and 11 are complete (this reuses the grading/results engine from Stage 5 and the queue/storage pattern from Stage 5/9). This is the biggest stage in this folder — take it slowly and test thoroughly, the same advice the original Stage 5 prompt gave for the results engine.

---

Read `docs/17-module-cbt-examination.md` **in full** before starting — every section number below refers to it. Build the **Phase 2 core** per `docs/20-roadmap-phases.md`: question bank, test assembly, randomization, timed auto-submit, auto-save, auto-grading + essay routing, JAMB mock mode. Explicitly **do not build** §3's lockdown/full-screen/tab-switch/webcam proctoring, §6's offline mode, or §8's difficulty/discrimination item-analysis indices — those are Phase 3, called out separately in `docs/22-implementation-status.md`. Basic per-test score distribution/average/pass-rate (not the per-question difficulty/discrimination index specifically) is reasonable to include now since it's a natural byproduct of auto-grading, not a separate proctoring/analysis system.

## 1. `QuestionBankModule` (§1)
- `Question` model: subject, topic (free text, NERDC-scheme reference — same convention as Stage 17's Lesson Notes, don't build a structured curriculum tree), classLevel, difficulty (`EASY`/`MEDIUM`/`HARD`), optional Bloom's-taxonomy tag, type (`MCQ_SINGLE` | `MCQ_MULTIPLE` | `TRUE_FALSE` | `FILL_BLANK` | `MATCHING` | `ESSAY`), prompt text, optional image attachment URL, options (JSON, shape depends on type), correct answer(s) (JSON — null/empty for `ESSAY`), `authoredByStaffId`, `status` (`PENDING` | `APPROVED` — auto-`APPROVED` if the school doesn't require governance, configurable per school the same way other optional-approval workflows in this codebase already are; if no existing precedent for a school-level "skip approval" toggle exists, default every question to requiring Exam Officer approval, matching Lesson Notes' default).
- `POST /questions` — `@Roles('SUBJECT_TEACHER', 'CLASS_TEACHER', 'EXAM_OFFICER', 'ADMIN')`.
- `PATCH /questions/:id/review` — `@Roles('EXAM_OFFICER', 'ADMIN')`, approve/return (same shape as Lesson Notes' review endpoint — reuse the pattern, not the code, since the models are unrelated).
- `GET /questions?subject=&topic=&difficulty=&type=&status=` — filterable bank browse.

## 2. `CBTTestModule` (§2)
- `CBTTest` model: title, classSubjectId, settings: timeLimitMinutes, attemptsAllowed, availableFrom, availableTo, passMark, instantRelease (boolean), showCorrectAnswersAfter (boolean), `createdByStaffId`. Optional: if configured as a formal assessment component, an `assessmentComponentId` FK (reuse Stage 5's `AssessmentComponent` — this is the "feeds into Academics & Results Engine" integration point from §9, don't build a parallel scoring path).
- `CBTTestQuestion` model: `testId`, `questionId`, order/weight if scores aren't uniform per question.
- `POST /cbt/tests` — `@Roles('SUBJECT_TEACHER', 'CLASS_TEACHER', 'EXAM_OFFICER')`, validated against `TeacherAssignment` like every other teacher-authored content in this build.
- Manual assembly: `POST /cbt/tests/:id/questions` (pick specific question IDs). Rule-based auto-assembly: `POST /cbt/tests/:id/auto-assemble` accepting rules like `[{ topic, difficulty, count }]`, randomly sampling matching `APPROVED` questions from the bank — reject if the bank doesn't have enough matching questions rather than silently assembling a shorter test.

## 3. Taking a test (§3–4)
- `CBTAttempt` model: `testId`, `studentId`, `startedAt`, `submittedAt`, status (`IN_PROGRESS` | `SUBMITTED` | `AUTO_SUBMITTED`), a per-student **randomized question order** and **randomized option order** snapshot (generate once at start, persist it — don't re-randomize on every fetch, or a refresh would visibly reshuffle answers mid-test).
- `CBTAnswer` model: `attemptId`, `questionId`, the student's answer (JSON, shape matches the question type), `answeredAt` — one row per answer, **upserted on every keystroke/selection** (this is the §4 "auto-save per answer" requirement — don't batch-save only on final submit, that defeats the entire point).
- `POST /cbt/tests/:id/start` — `@Roles('STUDENT')`, only within the `availableFrom`/`availableTo` window, only if `attemptsAllowed` hasn't been exhausted, creates the `CBTAttempt` + the randomized order snapshot, returns the question set in the student's randomized order (never the correct answers).
- `PATCH /cbt/attempts/:id/answers` — `@Roles('STUDENT')`, upserts one answer at a time, only for the attempt's own owner, only while `IN_PROGRESS` and within the time limit (reject if `now > startedAt + timeLimitMinutes`, same server-side time enforcement the spec implies — never trust a client-reported "time remaining").
- `POST /cbt/attempts/:id/submit` — `@Roles('STUDENT')`, transitions to `SUBMITTED`. A scheduled job (reuse `@nestjs/schedule`, same pattern as Stage 7's fee reminders and Stage 18's due-soon notifications) sweeps for `IN_PROGRESS` attempts past their time limit and auto-submits them as `AUTO_SUBMITTED` — this is the real auto-submit-at-time-up mechanism, not something the frontend can be trusted to enforce alone.

## 4. Grading (§5)
- On submit, auto-grade every objective answer immediately (exact match for MCQ/True-False/Fill-in-blank, set-equality for Multiple Response, pair-equality for Matching — implement a `FuzzyMatch` option for Fill-in-the-blank if reasonable, e.g. case-insensitive/trimmed compare, nothing more elaborate than that). `ESSAY` answers get `null` pending manual grading.
- `GET /cbt/attempts/:id` — student sees their own result immediately if every question auto-graded **and** `instantRelease` is true; otherwise a "pending" state until essay components are graded.
- `PATCH /cbt/attempts/:id/grade-essay` — `@Roles('SUBJECT_TEACHER')`, per-essay-question score + feedback. Once every essay question on an attempt is graded, finalize the total score and release it.
- If `assessmentComponentId` was set, write the final score into the existing `Score` table via the same path Stage 5's `POST /scores/submit` uses (reuse `ScoreService`'s upsert, don't duplicate it) — respecting that component's `maxScore` validation.

## 5. JAMB UTME Mock Practice Mode (§7)
- A `CBTTest` flagged `isMockPractice: true` (reuse the same model — a parallel "mock test" model would just duplicate everything above) with a UTME-conventional timing default (the real UTME format — note this in a comment if you're not certain of the exact current minute/subject-count convention, since it changes; use a reasonable, clearly-labeled default and let it be configured). No `assessmentComponentId` — these never feed the formal results engine.
- `GET /students/:id/mock-history` — a student's own mock-attempt history and score trend over time, visible on the Student dashboard, separate from formal assessment results.

## 6. Basic test-level analytics (not full item analysis)
- `GET /cbt/tests/:id/stats` — `@Roles('EXAM_OFFICER', 'SUBJECT_TEACHER', 'ADMIN')` (teacher scoped to their own test): score distribution buckets, average, pass rate (against `passMark`). This is the Phase-2-appropriate slice of §8 — leave per-question difficulty/discrimination index for the later Phase 3 stage.

**Done when**: a teacher can auto-assemble a 20-question mixed-difficulty test from approved bank questions, two students taking it simultaneously see genuinely different question/option orders, a deliberately-abandoned attempt (student stops answering, never clicks submit) gets correctly auto-submitted by the scheduled sweep once its time limit passes — not left `IN_PROGRESS` forever — objective questions grade instantly and correctly, a mixed test with one essay question correctly withholds the final score until the teacher grades that essay, a test configured as a formal CA component correctly writes into the same `Score` table Stage 5's gradebook reads from, and a student's JAMB mock-practice attempts are visibly separate from their formal assessment history.
