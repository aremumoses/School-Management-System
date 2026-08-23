# Student Dashboard

## Who uses this

Enrolled **students**, typically JSS1–SSS3 (ages roughly 10–18). The UI should be simple, mobile-friendly, and readable on lower-end Android devices and shared family phones, since many students access this from a parent's phone or a school computer lab rather than a personal device.

## Purpose

Give the student a self-service view of their own academic life — timetable, attendance, scores, assignments, and learning resources — and a safe, school-supervised way to take CBT tests and submit homework.

## Key Capabilities

### 1. Profile
- View own bio-data, class/arm, admission number, photo/ID card.
- Update non-sensitive contact details (subject to admin approval for sensitive fields).

### 2. Timetable
- View weekly class timetable.

### 3. Attendance
- View own attendance record for the current and past terms.

### 4. Scores & Report Cards
- View CA and exam scores per subject once released by the teacher (configurable: scores can be hidden until the term result is fully published, to avoid premature reactions before review).
- View/download the official report card PDF once published by the school.
- View result history/transcript across past terms and sessions.

### 5. Assignments & Homework
- View assignments posted by teachers, with due dates.
- Submit homework (file upload or text) before the deadline; see grading/feedback once graded.

### 6. CBT / Online Tests
- Take assigned computer-based tests within the configured time window, under exam-mode UI (full-screen, timer visible, no navigating away) — see [CBT & Examination Engine](17-module-cbt-examination.md).
- View result immediately for auto-graded objective tests (if the school enables instant release).
- Access JAMB UTME-style mock practice (SSS3) outside of formal assigned tests, for self-study.

### 7. E-Library / Learning Resources
- Browse notes, slides, and videos shared by teachers, organized by subject and topic.
- Search the digital library catalog and view borrowing status of physical books (if library module enabled).

### 8. Notice Board
- View school-wide and class-specific announcements.

### 9. Messaging
- Message own subject/class teachers (moderated, logged — not open peer-to-peer chat).

### 10. Fee Status (read-only)
- View own fee balance/status for the term (without payment details belonging to the parent).

### 11. Discipline Record (read-only)
- View own conduct/discipline record if the school chooses to expose it directly to students (otherwise visible only to parents/admin).

### 12. Extracurricular / Clubs
- View clubs/societies/sports teams the student is enrolled in and related schedules.

## Screens

- Home (today's timetable, latest notices, pending assignments)
- Profile
- Timetable
- Attendance
- Scores & Report Cards
- Assignments
- CBT Tests
- E-Library / Resources
- Notice Board
- Messages
- Fee Status
- Clubs & Activities

## Sample Workflows

**Taking a CBT test**: Student sees an assigned test on the home screen with a countdown → opens it within the available window → answers questions under timed, full-screen mode → submits (auto-submits at time-up) → sees the score immediately if instant release is enabled, otherwise waits for teacher review (theory questions).

**Checking a published report card**: After the school publishes term results, the student receives a notification → opens Scores & Report Cards → downloads the PDF report card.

## Notifications received
- New assignment posted / due soon.
- Test/CBT assigned and window opening soon.
- Report card published.
- New message from a teacher.
- New notice posted.

## Data exports
- Own report card (PDF)
- Own transcript across sessions (PDF)
