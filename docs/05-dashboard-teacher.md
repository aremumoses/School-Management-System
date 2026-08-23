# Teacher Dashboard

## Who uses this

**Subject Teachers**, **Class Teachers/Form Masters**, and **HODs** (HODs get a slightly extended view — see §8). This is the most frequently used dashboard day-to-day, since teachers touch attendance and scoring constantly.

## Purpose

Give teachers a fast, low-friction way to do the things that currently happen on paper or in disconnected Excel files: mark attendance, record CA/exam scores, set assignments, share resources, and communicate with parents — all tied automatically into the report card engine.

## Key Capabilities

### 1. My Classes & Subjects
- See only the classes/subjects assigned to this teacher (enforced server-side, not just hidden in UI).
- Quick switch between classes if teaching multiple.

### 2. Attendance Marking
- Mark daily (or per-period) attendance for an assigned class in a few taps: Present/Absent/Late/Excused.
- See a running attendance summary for the term.
- Absences can trigger automatic parent notification (configurable by school) — see [Communication Module](16-module-communication.md).

### 3. Lesson Notes / Plans
- Submit a lesson note per topic/week, mapped to the NERDC scheme of work for that subject and term.
- Track approval status (Pending → Approved by HOD/Admin → Returned for revision).
- Reuse/duplicate a previous term's lesson note as a starting point.

### 4. CA & Exam Score Entry
- Enter scores per student for each configured assessment component (CA1, CA2, Project, Exam, etc. — weights set by school, see [Academics & Results Module](14-module-academic-results.md)).
- Bulk entry grid (spreadsheet-like UI: rows = students, columns = assessment components) with inline validation (no score above the configured max).
- Auto-computed running total and provisional grade shown live as scores are entered, before submission.
- **Submit for approval** — once submitted, scores lock (no further edits without an Exam Officer/Admin-approved unlock, which is logged in the audit trail).
- See score-entry deadline countdown per class/subject.

### 5. Gradebook & Class Performance
- View historical scores for a class/subject across terms.
- See class average, highest/lowest score, and a simple performance distribution chart.
- Identify at-risk students (below a configurable threshold) at a glance.

### 6. Assignments & Homework
- Post an assignment with due date, instructions, and optional file attachment.
- View/grade submissions (file upload or text response).
- Auto-notify students/parents when an assignment is posted or due soon.

### 7. Resource Sharing
- Upload notes, slides, past questions, or video links tied to a subject/topic, visible to the relevant class(es).

### 8. CBT / Online Test Creation
- Build an objective test (MCQ, true/false, fill-in-the-blank) from the question bank or new questions, assign it to a class, set a time limit and availability window.
- View auto-graded results immediately after the test window closes — see [CBT & Examination Engine](17-module-cbt-examination.md).

### 9. Messaging
- Message parents or students of their own class/subject (moderated/logged, not open chat with the whole school).

### 10. Class Teacher / Form Master Extras
A teacher with the **Class Teacher** role (in addition to Subject Teacher) also gets:
- Affective & psychomotor domain rating entry for their class (punctuality, neatness, leadership, etc.) — feeds directly into the report card.
- Form teacher's comment field per student per term.
- A consolidated view of all subject scores for their class (read-only across subjects) to sanity-check before submission deadline.
- Class-wide attendance summary and conduct notes.

### 11. Leave Requests
- Submit a leave request and track approval status.

### 12. Timetable
- View personal weekly timetable (which class, which period, which room).

## Screens

- My Classes (home)
- Attendance entry
- Lesson Notes (list + editor + approval status)
- Score entry grid (per class/subject/assessment component)
- Gradebook / class performance
- Assignments (create, submissions, grading)
- Resources upload
- CBT test builder & results
- Messages
- Class Teacher view (affective/psychomotor ratings, form comment, consolidated scores) — only visible if role applies
- Leave requests
- My Timetable

## Sample Workflows

**Weekly routine**: Teacher opens app each morning → marks attendance for first period class → during the week posts an assignment, uploads a resource → as CA dates approach, enters CA1/CA2 scores in the grid → before the deadline, hits "Submit for approval."

**Term-end as Class Teacher**: After all subject teachers in the class have submitted scores, the Class Teacher reviews the consolidated read-only view, fills in affective/psychomotor ratings and the form teacher's comment for each student, then it moves into the Exam Officer's collation queue (see [Exam Officer Dashboard](09-dashboard-exam-officer.md)).

## Notifications received
- Score entry deadline approaching/passed.
- Lesson note approved/returned.
- New message from a parent.
- Assignment submission received.
- Leave request approved/rejected.

## Data exports
- Class gradebook (Excel)
- Attendance register for the term (Excel/PDF)
