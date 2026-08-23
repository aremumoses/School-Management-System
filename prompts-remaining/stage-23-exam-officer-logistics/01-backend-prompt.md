# Stage 23 — Backend Prompt (Exam Officer Logistics)

> Copy everything below the line into Claude Code as one message. Assumes Stages 1–9, 11, 16 (Timetable), and 22 (CBT Engine) are complete — this stage reuses both. Closes the rest of `docs/22-implementation-status.md` §6: exam timetable, invigilation roster, external exam body registration, malpractice log, and Phase-2-appropriate statistics (pass-rate, not item-analysis indices — those stay Phase 3, same boundary Stage 22 drew).

---

Read `docs/09-dashboard-exam-officer.md` §2, §8–10 before starting.

## 1. Exam Timetable & Hall/Seat Allocation
- `ExamSession` model: subject, classId/armId(s), date, startTime, durationMinutes, termId. `POST /exam-sessions` — `@Roles('EXAM_OFFICER', 'ADMIN')`, **clash detection** against the class's regular `TimetableEntry` (Stage 16) at that date/time, and against other `ExamSession`s sharing the same arm — reuse Stage 16's conflict-checking approach rather than writing a second implementation.
- `ExamHall` model (simple: name, capacity) and `ExamSeatAllocation` (examSessionId, studentId, hallId, seatNumber) — `POST /exam-sessions/:id/allocate-seats` auto-assigns seats sequentially per hall capacity; expose a manual override endpoint too for the inevitable edge case.

## 2. Invigilation Roster
- `InvigilationDuty` model: examSessionId, staffId, role (`LEAD` | `ASSISTANT`). `POST /exam-sessions/:id/invigilators` — `@Roles('EXAM_OFFICER', 'ADMIN')`, and on assignment, notify the staff member (reuse `BroadcastsService`, new `INVIGILATION_DUTY` template) per the spec's "notify assigned staff."

## 3. External Exam Body Registration
- `ExternalExamCandidate` model: studentId, examBody (`BECE` | `WAEC` | `NECO` | `NABTEB` | `JAMB`), sessionYear, subjectCombination (string array — reuse the existing SSS Science/Arts/Commercial combination concept from Stage 3 if one already exists there, don't invent a second one), registrationNumber (nullable until the body issues it), status.
- `POST /external-exams/candidates`, `GET /external-exams/candidates?examBody=&sessionYear=`, `PATCH /external-exams/candidates/:id` — `@Roles('EXAM_OFFICER', 'ADMIN')`.
- `GET /external-exams/candidates/export?examBody=` — Excel export in a generically useful column layout (subject combination, full bio-data, registration number) — note in a code comment that the *exact* per-body file format (WAEC's CSV spec, NECO's, etc.) isn't standardized enough to hardcode confidently without the school's actual current-year template in hand; this export is the "best generic starting point a school can reformat from," not a guaranteed drop-in upload file.
- `GET /students/:id/ca-summary-for-external-body?examBody=` — maps the student's existing internal CA scores (reusing Stage 5's `Score`/`Result` data) into a simple summary shape, per the spec's "map internal CA scores to the format required."

## 4. Exam Malpractice Log
- `MalpracticeIncident` model: examSessionId (nullable — could be a CBT attempt instead; see below), studentId, description, actionTaken, `loggedByStaffId`, `loggedAt`. **Deliberately separate from Stage 9's `Incident`** (per the spec's "separate from general discipline records, but cross-referenced") — add an optional `relatedDisciplineIncidentId` FK if the Exam Officer escalates it into the formal discipline workflow, but don't merge the models.
- If the incident originated from a CBT attempt's anti-cheating log (a Stage 22 concept that wasn't built — Stage 22 deliberately deferred lockdown/tab-switch detection to Phase 3), allow `cbtAttemptId` as an alternative origin reference now so Phase 3's anti-cheating work has somewhere to log into later without another migration; leave it nullable and unused until then.
- `POST /malpractice-incidents`, `GET /malpractice-incidents` — `@Roles('EXAM_OFFICER', 'ADMIN')`.

## 5. Statistics (Phase 2 slice)
- `GET /statistics/pass-rate?subjectId=&classId=&termId=` — pass rate against the school's configured passing grade, reusing Stage 5's grading-scale lookup.
- `GET /statistics/subject-comparison?termId=` — average score per subject across classes/arms, for spotting which subject is trending weak schoolwide.
- Leave per-question difficulty/discrimination index out of scope — that's Stage 22's explicitly-deferred Phase 3 item, not this stage's.

**Done when**: an exam timetable entry correctly rejects a clash against an arm's regular class timetable, seat allocation produces a real hall+seat assignment per candidate, an invigilator is notified on assignment, a BECE candidate list exports to a usable Excel sheet, a malpractice incident can be logged independently of Stage 9's discipline model, and the pass-rate endpoint's numbers match a manual check against seeded term results.
