# 02 — Master Feature List

Exhaustive checklist of every feature in the System, grouped by category. This is the single source of truth for "what does the product do" — every dashboard and module doc references back to items here.

Legend: **(P1)** MVP/Phase 1, **(P2)** Phase 2, **(P3)** Phase 3 / advanced. See [20-roadmap-phases.md](20-roadmap-phases.md) for the full phase plan.

## 1. School Setup & Configuration
- [ ] (P1) School profile setup (name, logo, address, registration number, motto, colors)
- [ ] (P1) School academic session & term setup (start/end dates, current term toggle)
- [ ] (P1) School profile document (for letterheads, report cards, certificates)
- [ ] (P1) Grading scale & CA weighting configuration
- [ ] (P2) Module toggles (enable/disable Hostel, Transport, Library, CBT depending on what the school actually runs)

## 2. Admissions & Enrollment
- [ ] (P1) Online application form (configurable fields)
- [ ] (P1) Application fee payment
- [ ] (P2) Entrance examination scheduling & scoring
- [ ] (P2) Applicant shortlisting & interview scheduling
- [ ] (P1) Admission offer letter generation (PDF)
- [ ] (P1) Convert admitted applicant → enrolled student record
- [ ] (P1) Class & arm placement on admission
- [ ] (P1) Bulk student import (CSV/Excel) for schools migrating from manual records
- [ ] (P2) Waitlist management
- [ ] (P3) Online document upload (birth certificate, previous school testimonial, immunization record)

## 3. Student Information Management (SIM)
- [ ] (P1) Full student bio-data (name, DOB, gender, state of origin, LGA, religion, blood group, genotype, address, photo)
- [ ] (P1) Guardian/parent linkage (one or more guardians per student, relationship type)
- [ ] (P1) Class & arm assignment, subject combination (Science/Arts/Commercial for SSS)
- [ ] (P1) Student unique ID / admission number auto-generation
- [ ] (P1) Digital ID card generation with QR code (P2 for QR gate-scan verification)
- [ ] (P1) Academic history across sessions (which class/term each session)
- [ ] (P1) Promotion / repeat / withdrawal / transfer / graduation status tracking
- [ ] (P1) Document repository per student (testimonials, certificates, medical forms)
- [ ] (P2) Sibling linkage (for family fee discounts, shared parent login)
- [ ] (P1) Search & filter students by class, arm, session, status

## 4. Staff / HR Management
- [ ] (P1) Staff bio-data & employment record (qualification, role, department, date of employment)
- [ ] (P1) Role & permission assignment
- [ ] (P2) Recruitment pipeline (job posting → applicant → interview → hire)
- [ ] (P2) Leave management (request, approval workflow, leave balance)
- [ ] (P2) Payroll processing (salary structure, PAYE tax, pension deduction per Nigerian law, payslip generation)
- [ ] (P2) Staff attendance / clock-in-clock-out
- [ ] (P2) Performance appraisal cycles
- [ ] (P3) Training / continuing professional development (CPD) tracking
- [ ] (P2) Disciplinary record log
- [ ] (P2) Staff document storage (CV, certificates, ID, contract)
- [ ] (P2) Offboarding / exit process

## 5. Academic Management
- [ ] (P1) Class & arm/section setup (e.g., JSS1 Gold, SSS2 Science A)
- [ ] (P1) Subject catalog, mapped to class levels and subject combinations
- [ ] (P1) Curriculum / scheme of work per subject, mapped to NERDC topics & term
- [ ] (P1) Subject-teacher assignment per class
- [ ] (P1) Timetable builder (period-based, conflict detection)
- [ ] (P1) Lesson note submission & HOD/Admin approval workflow
- [ ] (P2) Topic-by-topic syllabus completion tracking
- [ ] (P1) Class teacher / form master assignment

## 6. Attendance Management
- [ ] (P1) Daily attendance marking (per class, per period optional)
- [ ] (P1) Attendance status types (present, absent, late, excused, on leave)
- [ ] (P1) Parent notification on absence (SMS/push)
- [ ] (P1) Attendance summary on report card
- [ ] (P2) Staff attendance / clock-in
- [ ] (P3) Biometric / RFID card attendance integration
- [ ] (P2) Attendance analytics (chronic absenteeism flags, trend charts)

## 7. Examinations & Continuous Assessment
- [ ] (P1) Configurable assessment structure (CA1, CA2, CA3, Project, Exam — weights configurable per school)
- [ ] (P1) Score entry per subject per class by subject teacher
- [ ] (P1) Score entry deadline & lock-after-submission workflow
- [ ] (P1) Auto-computed total score, grade, and class position
- [ ] (P2) Exam timetable & hall/seat allocation
- [ ] (P2) Invigilation duty roster
- [ ] (P2) Exam malpractice incident logging
- [ ] (P2) Statistical analysis (pass rate, subject performance, item analysis)
- [ ] (P3) WAEC/NECO/BECE/JAMB candidate registration tracking & data export

## 8. CBT (Computer-Based Testing)
- [ ] (P2) Question bank (subject, topic, difficulty, Bloom's level tagging)
- [ ] (P2) Multiple question types: MCQ, theory (manual grading), fill-in-the-blank, matching, true/false
- [ ] (P2) Randomized question & option order per student
- [ ] (P2) Timed tests with auto-submit
- [ ] (P2) Auto-grading for objective questions
- [ ] (P3) Full-screen lockdown & tab-switch detection (anti-cheating)
- [ ] (P3) Optional webcam snapshot proctoring
- [ ] (P3) Offline CBT mode with later sync
- [ ] (P2) JAMB UTME-style mock practice mode for SSS3
- [ ] (P3) Item analysis per question (difficulty index, discrimination index)

## 9. Results & Report Cards
- [ ] (P1) Auto-generated report card (PDF) per student per term
- [ ] (P1) Nigerian-standard layout: subject scores (CA + Exam breakdown), grade, class average, position in subject, position in class
- [ ] (P1) Affective & psychomotor domain ratings (punctuality, neatness, leadership, sports, etc.)
- [ ] (P1) Form teacher's comment & Principal's comment fields
- [ ] (P1) Attendance summary on report card
- [ ] (P1) Result approval workflow (Teacher → HOD/Exam Officer → Principal → Publish)
- [ ] (P1) Broadsheet (whole-class result grid) generation
- [ ] (P2) Cumulative/term-on-term performance trend per student
- [ ] (P2) Transcript generation across multiple sessions
- [ ] (P1) Auto promotion logic at session rollover (configurable threshold)
- [ ] (P3) AI-suggested teacher comments based on score trend (human-reviewed before publish)

## 10. Fees & Finance
- [ ] (P1) Fee structure setup per class/term/session (tuition, PTA levy, development levy, exam fee, uniform, etc.)
- [ ] (P1) Invoice generation per student per term
- [ ] (P1) Online payment via Paystack/Flutterwave
- [ ] (P2) Remita integration (for schools needing it)
- [ ] (P1) Manual payment recording (cash/bank transfer/POS) by bursar
- [ ] (P1) Payment receipt generation (PDF, printable)
- [ ] (P1) Defaulter tracking & list
- [ ] (P1) Automated payment reminders (SMS/email/WhatsApp)
- [ ] (P2) Installment / payment plan support
- [ ] (P2) Scholarship & discount management (sibling discount, staff-child discount, bursary)
- [ ] (P2) Expense tracking (non-fee school expenditure)
- [ ] (P2) Financial reports: income statement, collection summary, outstanding report, term-on-term comparison
- [ ] (P2) Payroll integration (see HR)

## 11. Communication & Notifications
- [ ] (P1) In-app notice board
- [ ] (P1) SMS broadcast (Termii/Africa's Talking/local gateway)
- [ ] (P1) Email broadcast
- [ ] (P2) WhatsApp Business API broadcast & two-way messaging
- [ ] (P1) Push notifications (PWA)
- [ ] (P1) Targeted broadcast (by class/arm/individual/role)
- [ ] (P1) Message templates (fee reminder, exam result ready, absence alert)
- [ ] (P2) Delivery/read status tracking
- [ ] (P2) Two-way messaging between teacher and parent (moderated)
- [ ] (P3) USSD short-code fallback for parents without smartphones/data

## 12. Library Management
- [ ] (P2) Book catalog with ISBN/barcode
- [ ] (P2) Issue / return tracking with due dates
- [ ] (P2) Fine calculation for overdue books
- [ ] (P2) Member management (students & staff)
- [ ] (P2) Reservation system
- [ ] (P3) Digital/e-book repository
- [ ] (P2) Library usage analytics (most borrowed, overdue rate)

## 13. Hostel / Boarding Management
- [ ] (P2) Room & bed allocation
- [ ] (P2) Boarder roster per hostel/house
- [ ] (P2) Morning/evening roll-call attendance
- [ ] (P2) Visitation log (who visited a boarder, when)
- [ ] (P2) Inventory tracking (beddings, equipment)
- [ ] (P2) Sick-bay / health incident log specific to boarders
- [ ] (P2) Hostel-specific discipline incident log

## 14. Transport Management
- [ ] (P2) Bus/route management
- [ ] (P2) Student-to-route assignment
- [ ] (P2) Driver & conductor records
- [ ] (P2) Pickup/drop-off attendance
- [ ] (P3) Live GPS tracking integration for parents
- [ ] (P2) Transport fee tied into the billing module
- [ ] (P2) Vehicle maintenance log

## 15. Inventory & Asset Management
- [ ] (P2) School asset register (furniture, lab equipment, computers)
- [ ] (P2) Asset assignment to department/room
- [ ] (P2) Stock/consumables tracking (stationery, lab consumables)
- [ ] (P2) Maintenance scheduling & history

## 16. Health & Wellness Records
- [ ] (P2) Student medical bio-data (allergies, conditions, blood group, emergency contact)
- [ ] (P2) School clinic visit log
- [ ] (P2) Immunization record tracking
- [ ] (P3) Incident report with parent notification

## 17. Discipline & Behavior Management
- [ ] (P1) Incident/demerit logging per student
- [ ] (P1) Disciplinary action record (warning, suspension, expulsion) with workflow
- [ ] (P1) Parent notification on disciplinary action
- [ ] (P2) Behavior trend tracking feeding into report card conduct rating

## 18. Front Desk / Visitor & Security Management
- [ ] (P2) Visitor sign-in/out log with photo capture
- [ ] (P2) Gate pass generation for early pick-up
- [ ] (P2) Authorized pickup-person verification against guardian record
- [ ] (P2) Late-arrival logging
- [ ] (P3) Prospective-parent inquiry CRM at reception

## 19. Calendar & Events
- [ ] (P1) School calendar (term dates, holidays, exams, events)
- [ ] (P1) Event creation & RSVP (PTA meeting, sports day, prize-giving day)
- [ ] (P2) Personal calendar sync (per teacher/parent) — iCal export

## 20. Document & Certificate Management
- [ ] (P1) Testimonial / transfer letter generation
- [ ] (P1) Certificate of attendance/completion generation
- [ ] (P2) Bulk document generation (e.g., all SSS3 testimonials at once)
- [ ] (P2) Document e-signature (Principal sign-off)

## 21. Alumni Management
- [ ] (P3) Alumni directory
- [ ] (P3) Alumni event/newsletter broadcast
- [ ] (P3) Alumni donation/giving tracking

## 22. Reports & Analytics
- [ ] (P1) Admin dashboard KPIs (enrollment, attendance rate, fee collection rate, average performance)
- [ ] (P2) Cross-term/cross-session trend analytics
- [ ] (P2) Subject/teacher performance analytics
- [ ] (P2) Exportable reports (PDF/Excel) for all of the above
- [ ] (P3) Predictive at-risk-student flagging (AI)

## 23. Parent Engagement
- [ ] (P1) Multi-child single login dashboard
- [ ] (P1) Real-time attendance & fee alerts
- [ ] (P1) Online fee payment
- [ ] (P2) Consent / permission-slip e-signing
- [ ] (P2) Event RSVP
- [ ] (P3) USSD access to attendance/fee/result summary

## 24. Mobile / PWA & Offline Support
- [ ] (P1) Responsive web app usable on mobile browsers
- [ ] (P2) Installable PWA (Add to Home Screen) with push notifications
- [ ] (P2) Offline-first data entry for attendance/CA scores in low-connectivity classrooms, with background sync
- [ ] (P3) Native mobile app (React Native) reusing the same API

## 25. System Administration & Settings
- [ ] (P1) Role & permission management UI
- [ ] (P1) Academic session/term configuration
- [ ] (P1) Grading scale & CA weight configuration
- [ ] (P1) School branding settings (logo, colors, letterhead)
- [ ] (P2) Audit log of all sensitive actions
- [ ] (P2) Data import/export tools
- [ ] (P3) API access / webhooks for third-party integration

## 26. Security, Privacy & Compliance
- [ ] (P1) Role-based access control (RBAC) enforced server-side
- [ ] (P1) Encrypted data at rest and in transit
- [ ] (P1) NDPR-aligned consent & data handling for minors
- [ ] (P2) Full audit trail (who changed what, when)
- [ ] (P2) Configurable data retention & export-on-request (data subject rights)
- [ ] (P3) Penetration-tested, SOC2-style security posture for Enterprise tier

## 27. Integrations
- [ ] (P1) Paystack / Flutterwave payment gateways
- [ ] (P2) Remita
- [ ] (P1) SMS gateway (Termii / Africa's Talking / KudiSMS)
- [ ] (P2) WhatsApp Business API
- [ ] (P1) Email (Resend/SendGrid/Postmark)
- [ ] (P3) Google Classroom / Microsoft Teams style external LMS bridge (optional)
- [ ] (P3) JAMB/WAEC data export formats

## 28. AI-Powered Features (Differentiators)
- [ ] (P3) AI-suggested report card comments (human-reviewed before publishing)
- [ ] (P3) AI early-warning system for at-risk students (score/attendance trend based)
- [ ] (P3) AI chatbot for parent FAQs (fee balance, attendance, results) via WhatsApp
- [ ] (P3) AI-assisted lesson note drafting from curriculum topics for teachers

See [19-unique-differentiators.md](19-unique-differentiators.md) for the rationale behind each of these.
