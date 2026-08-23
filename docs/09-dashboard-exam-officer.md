# Exam Officer Dashboard

## Who uses this

The **Exam Officer** (sometimes called Head of Exams/Records), responsible for exam logistics, score collation, result computation, and liaison with external bodies (WAEC, NECO, NABTEB, BECE, JAMB).

## Purpose

Centralize everything around exams and results: scheduling, collation, ranking, approval routing, and external-exam-body administration — work that is currently a manual, days-long scramble at the end of every term in most Nigerian secondary schools.

## Key Capabilities

### 1. Assessment Structure Configuration
- Configure (or confirm school-wide default) CA/exam weighting per term — e.g., CA1 10% + CA2 10% + CA3 10% + Exam 70%, or whatever split the school uses (see [Academics & Results Module](14-module-academic-results.md)).
- Set score-entry deadlines per class/subject, visible to teachers as a countdown.

### 2. Exam Timetable & Logistics
- Build the exam timetable (subject, date, time, duration) with clash detection against the class timetable.
- Allocate exam halls/seats, including seat-numbering for larger cohorts (useful for both internal exams and mock WAEC/NECO/JAMB sittings).
- Build the invigilation duty roster and notify assigned staff.

### 3. Score Collation
- Monitor real-time submission status per subject/class (who has submitted, who hasn't, how close to deadline).
- Lock score entry at the deadline (or manually), and handle unlock requests from teachers with an audit-logged reason.
- View the **broadsheet** — a full class × subject score grid — as soon as all subjects for a class are in.

### 4. Result Computation & Ranking
- Auto-compute per-subject grade (per the school's configured grading scale, e.g., WAEC-style A1–F9 or a custom scale).
- Auto-compute **position in subject** (rank within the class for that subject) and **overall position in class** (rank by aggregate/average across all subjects).
- Flag anomalies (e.g., a score entered that's wildly inconsistent with a student's term-to-date trend) for a sanity check before publishing.

### 5. Result Approval Workflow
- Submit collated results to the Principal/School Admin for final sign-off (see [School Admin Dashboard](04-dashboard-school-admin.md)).
- Track approval status per class; handle "returned for correction" cases.
- Trigger publishing (report cards become visible to students/parents, with notifications sent) once approved.

### 6. Broadsheets & Transcripts
- Generate and export the broadsheet per class/term (Excel/PDF) for school records and regulatory inspection.
- Generate a multi-session transcript for a student (e.g., for transfer or post-graduation purposes).

### 7. CBT/Exam Engine Administration
- Own the school-wide question bank governance (review/approve teacher-submitted questions, organize by subject/topic/difficulty).
- Schedule formal CBT exams (as opposed to a teacher's informal class quiz) — see [CBT & Examination Engine](17-module-cbt-examination.md).

### 8. External Examination Body Liaison
- Track BECE candidate registration (JSS3) and WAEC/NECO/NABTEB candidate registration (SSS3), including subject combinations registered per candidate.
- Map internal CA scores to the format required for any external body that requests school-based continuous assessment data.
- Generate the data export format needed for bulk candidate registration where supported.
- Manage JAMB UTME mock-practice scheduling for SSS3 (drives usage of the CBT mock mode — see [CBT & Examination Engine](17-module-cbt-examination.md)).

### 9. Exam Malpractice Logging
- Log incidents during internal exams (who, what, when, action taken), separate from general discipline records but cross-referenced.

### 10. Statistical Analysis
- Pass-rate per subject/class/term.
- Subject performance comparison across classes/arms.
- Item analysis per CBT question (difficulty index, discrimination index) to flag poorly-written questions over time.

## Screens

- Exam Officer Overview (submission status across all classes/subjects, pending approvals)
- Assessment Structure setup
- Exam Timetable & Hall/Seat Allocation
- Invigilation Roster
- Score Collation / Broadsheet view
- Result Approval Queue
- Transcripts
- Question Bank governance
- CBT Exam Scheduling
- External Exam Body Registration Tracking
- Malpractice Log
- Statistical Analysis / Item Analysis

## Sample Workflows

**Term-end collation**: Exam Officer watches the live submission tracker as teachers submit scores → once a class is complete across all subjects, opens the broadsheet → system auto-computes grades and positions → spot-checks anomalies → sends to Principal for approval → on approval, clicks "Publish."

**BECE season**: Exam Officer opens the JSS3 candidate list → confirms subject registrations per candidate → exports the registration data in the required format → later in the session, cross-checks the school's internal CA records align with what's required to be submitted alongside BECE.

## Notifications received
- Teacher submission deadlines approaching/missed, per class/subject.
- Unlock request from a teacher.
- Principal returns a result batch for correction.
- Malpractice incident logged by an invigilator.

## Data exports
- Broadsheet per class/term (Excel/PDF)
- Transcript (PDF)
- External exam body candidate registration file
- Statistical/item analysis reports (Excel/PDF)
