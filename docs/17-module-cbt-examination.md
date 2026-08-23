# Module — CBT & Examination Engine

Owned operationally by the [Exam Officer Dashboard](09-dashboard-exam-officer.md), used to build/assign tests by [Teachers](05-dashboard-teacher.md), and taken by [Students](06-dashboard-student.md). This module exists for two reasons: (1) reduce exam malpractice risk that's a constant concern in Nigerian schools, and (2) prepare SSS3 students for the **JAMB UTME**, which is itself a CBT exam — practicing in a similar interface has real value.

## 1. Question Bank

- Each question is tagged: **subject**, **topic** (mapped to the NERDC scheme of work), **class level**, **difficulty** (easy/medium/hard), and optionally **Bloom's taxonomy level** (recall, application, analysis, etc.).
- **Question types**: Multiple Choice (single answer), Multiple Response (select all that apply), True/False, Fill-in-the-blank, Matching, Theory/Essay (manually graded).
- Questions can be authored by teachers and optionally routed through an Exam Officer approval step before entering the shared school-wide bank (governance — prevents poor-quality questions from accumulating unchecked).
- Support for image/diagram attachments within a question (common in Science/Geography questions).

## 2. Test Assembly

- A test is assembled either by **manually picking questions** or by **rule-based auto-assembly** (e.g., "20 questions from Topic X, mixed difficulty, randomly selected from the bank").
- Test settings: time limit, number of attempts allowed, availability window (opens/closes at a set date-time), pass mark, instant-release of score (yes/no), whether correct answers are shown after submission.

## 3. Anti-Cheating Measures

- **Randomized question order** and **randomized option order** per student, so two students sitting side by side don't see the same sequence.
- **Timed auto-submit** — when time expires, the test submits automatically with whatever has been answered.
- **Full-screen/lockdown mode** (Phase 3) — browser tab-switch or window-blur is detected and logged (and can be configured to auto-submit or flag for review after N violations).
- **Optional webcam snapshot proctoring** (Phase 3) — periodic snapshots during the test, stored for the Exam Officer to spot-check, used sparingly given bandwidth/privacy considerations.
- All anti-cheating events (tab switches, time anomalies) are logged against the attempt for the Exam Officer's malpractice log (see [Exam Officer Dashboard](09-dashboard-exam-officer.md) §9).

## 4. Taking a Test (Student Experience)

- Test only becomes accessible within its configured availability window.
- Clear, large countdown timer always visible.
- Auto-save per answer (no "lost everything because the network blipped" risk) — answers sync as they're given, and the test can resume from where it left off if the connection drops momentarily.
- Auto-submit at time-up or on manual submit.

## 5. Grading

- **Objective questions** (MCQ, True/False, Fill-in-the-blank with exact/fuzzy match, Matching) are auto-graded instantly on submission.
- **Theory/Essay questions** route to the assigned teacher for manual grading with a rubric/marking guide field, and the final score only releases once all components are graded (if the test mixes objective and theory).
- Score feeds directly into the [Academics & Results Engine](14-module-academic-results.md) if the test is configured as a formal CA/exam component, or stands alone as a practice/quiz score otherwise.

## 6. Offline Mode (Phase 3)

- For schools with unreliable internet in the exam hall, a downloadable offline test package can be taken on a local device and synced back to the server once connectivity returns — answers are timestamped locally so the time limit is still enforced correctly on sync.

## 7. JAMB UTME Mock Practice Mode

- A dedicated practice area for SSS3 students mimicking the JAMB UTME CBT interface and timing conventions, using either school-authored questions or an imported JAMB-style past-question bank.
- Tracks a student's mock-practice history and score trend over time, separate from formal school assessments, visible on the [Student Dashboard](06-dashboard-student.md).

## 8. Analytics & Item Analysis

- Per-question **difficulty index** (% of students who got it right) and **discrimination index** (does the question correctly separate strong from weak students) — flags questions that may be poorly written or miskeyed.
- Per-test score distribution, average, and pass rate, visible to the Exam Officer and the relevant Subject Teacher.

## 9. Integration Points

- Feeds into [Academics & Results Engine](14-module-academic-results.md) when a CBT is a formal assessment component.
- Feeds into [Exam Officer Dashboard](09-dashboard-exam-officer.md) for malpractice logging and item analysis.
- Question authoring is available from [Teacher Dashboard](05-dashboard-teacher.md).
