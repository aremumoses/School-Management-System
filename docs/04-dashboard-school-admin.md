# School Admin (Principal) Dashboard

## Who uses this

The **Principal**, or a designated **School Admin**, running the day-to-day operation of the school. This is the most-used dashboard in the system after the Teacher and Parent dashboards, and the operational center of the product.

## Purpose

Give the principal full operational control and visibility over their school: people (staff & students), academics, attendance, exams/results, finance oversight, communication, and compliance documents — all from one place, replacing the binder-and-Excel approach.

## Key Capabilities

### 1. Dashboard Overview (Home)
- KPI cards: total students, total staff, today's attendance rate, fee collection rate this term, upcoming events, pending approvals (results awaiting sign-off, leave requests, lesson notes).
- Quick links to the most common actions (record new admission, broadcast a notice, approve results).

### 2. Admissions & Enrollment
- Review and approve/reject applications submitted via the public admission form (see [02-feature-list.md](02-feature-list.md) §2 Admissions).
- Convert an approved applicant into an enrolled student, assigning class/arm.
- Bulk-import existing students via Excel template when first migrating onto the system.

### 3. Staff Management
- Onboard new staff, assign role(s) (Subject Teacher, Class Teacher, HOD, Exam Officer, Bursar, etc.).
- View staff directory, department structure, and subject/class assignments.
- Approve leave requests (delegated from HR or handled directly in smaller schools).

### 4. Academic Setup
- Create/edit academic session and terms (start/end dates), and toggle the "current term."
- Create classes and arms (e.g., JSS1 Gold/Silver/Bronze, SSS2 Science A/B).
- Create/edit subjects and map them to class levels and subject combinations (Science/Arts/Commercial).
- Assign subject teachers to class–subject pairs.
- Build/approve the timetable (conflict detection: no teacher or room double-booked).
- Approve lesson notes submitted by teachers (or delegate to HODs).

### 5. Attendance Oversight
- View school-wide and per-class attendance dashboards.
- See chronic-absenteeism flags and drill into a specific student's attendance history.

### 6. Examinations & Results
- Set the assessment structure for the term (CA1/CA2/Project/Exam weights).
- Set score-entry deadlines for teachers.
- Approve/publish term results after Exam Officer collation (final sign-off before parents/students can see report cards) — see [Academics & Results Module](14-module-academic-results.md).
- Write/approve the **Principal's comment** field on report cards (individually or in bulk with smart defaults based on performance band).
- View broadsheets per class.

### 7. Finance Oversight
- Set or approve the term's fee structure (delegating day-to-day entry to the Bursar).
- View collection-rate dashboard and the defaulters list (read access; the Bursar does the collection work — see [Bursar Dashboard](08-dashboard-bursar.md)).

### 8. Communication
- Broadcast notices to specific classes, the whole school, staff only, or parents only.
- Approve/oversee messages sent by teachers if moderation is enabled.

### 9. Calendar & Events
- Manage the school calendar: term dates, public holidays, exam periods, PTA meetings, sports day, prize-giving day.
- Create events with RSVP for parents/staff.

### 10. Discipline Oversight
- Review escalated disciplinary cases (suspension/expulsion recommendations) and approve or override the outcome.

### 11. Documents & Certificates
- Approve and digitally sign testimonials, transfer letters, and certificates before they're released to students/parents.

### 12. Analytics & Reports
- School-wide performance trend across terms/sessions.
- Subject and teacher performance comparison.
- Attendance and fee-collection trend charts.
- Exportable reports (PDF/Excel) for the proprietor/board.

### 13. Settings
- School profile (name, logo, address, registration number, motto, colors).
- Grading scale & CA weighting configuration.
- Module toggles (e.g., enable the Hostel module only if the school is boarding, enable Transport only if it runs buses).
- Role & permission fine-tuning beyond the defaults.

## Screens

- Dashboard Home (KPIs + pending approvals)
- Admissions (Applicants list → Applicant detail → Convert to Student)
- Staff Directory → Staff detail
- Students Directory → Student detail (academic history, attendance, fees, discipline — single 360° view)
- Classes & Arms setup
- Subjects & Curriculum setup
- Timetable builder
- Lesson Note approvals
- Attendance dashboard
- Assessment structure setup
- Result approval queue → Broadsheet view → Report card preview
- Fee structure setup, Collection dashboard (read)
- Communication composer & history
- Calendar & Events
- Discipline case queue
- Document approval queue
- Analytics & Reports
- Settings

## Sample Workflows

**New academic session rollover**: Admin creates new session → defines 3 terms with dates → (optionally) runs auto-promotion based on previous session's final results → confirms class/arm rosters for the new session → publishes the new calendar.

**Term-end result publishing**: Subject teachers submit scores by deadline → Exam Officer collates and computes positions/broadsheets → Admin reviews broadsheet, writes/approves principal's comments → Admin clicks "Publish" → report cards become visible to parents/students and a notification is sent.

**New admission to enrollment**: Parent submits the online application → Admin reviews → schedules/records entrance exam score (if used) → Admin approves → applicant converted to enrolled student with class/arm assignment → welcome SMS/email sent with parent portal login.

## Notifications received
- New admission application submitted.
- Results awaiting final approval.
- Fee collection rate below threshold.
- Disciplinary case escalated for review.
- Leave request awaiting approval.
- Lesson note awaiting approval.

## Data exports
- Student roster (Excel)
- Staff roster (Excel)
- Broadsheet per class/term (Excel/PDF)
- Attendance report (Excel/PDF)
- Fee collection summary (Excel/PDF)
