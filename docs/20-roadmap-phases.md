# 20 — Roadmap & Phases

A practical build order. Each phase should be shippable/usable on its own — Phase 1 alone is a viable product the school could run a term on.

This is the feature-level roadmap. For the literal step-by-step build sequence (commands, prompts, what order to write code in), see [21-build-guide.md](21-build-guide.md), which follows this same Phase 1 → 2 → 3 structure.

## Phase 1 — MVP (core daily operation)

Goal: the school can fully replace its paper/Excel workflow for the most painful parts — admissions, student records, attendance, results, basic fees, basic comms.

- School setup (profile, session/term setup, grading scale config).
- Admissions (online application → approve → enroll).
- Student Information Management (full bio-data, class/arm assignment, document storage).
- Academic setup: classes, arms, subjects, subject-teacher assignment, timetable.
- Attendance marking + parent absence alert (SMS + push).
- CA/Exam score entry, configurable assessment structure, grading scale.
- Result computation (grade, position in subject/class), approval workflow, report card PDF generation (full Nigerian layout incl. affective/psychomotor).
- Auto-promotion suggestion at session rollover.
- Fee structure setup, invoicing, manual payment recording, Paystack/Flutterwave online payment, receipts, defaulters list.
- Communication: in-app notice board, SMS broadcast, email broadcast, targeted broadcast.
- Discipline incident logging.
- Calendar & events (term dates, holidays, basic events).
- Document generation: testimonials, certificates.
- Dashboards: School Admin, Teacher, Student, Parent, Bursar, Exam Officer.
- RBAC, audit log (core actions), encrypted storage, NDPR-aligned consent capture.
- Responsive web app (mobile-friendly, not yet a full PWA).

## Phase 2 — Operational depth & engagement

Goal: cover the rest of the school's operations and deepen parent/staff engagement.

- CBT engine (question bank, test assembly, auto-grading, JAMB mock-practice mode).
- Library management (catalog, circulation, fines, reservations).
- HR module (recruitment, leave management, payroll with PAYE/pension, staff attendance).
- Transport management (routes, student assignment, pickup/drop attendance, fee link).
- Hostel management (room/bed allocation, roll-call, visitation log).
- Front desk / visitor & gate-pass management, authorized pickup verification.
- Installments/payment plans, scholarships/discounts, expense tracking, fuller financial reporting.
- WhatsApp Business API integration, two-way messaging, escalating fee-reminder sequence.
- Analytics & reporting: cross-term trends, subject/teacher performance.
- Installable PWA with push notifications.
- Exam logistics: exam timetable, hall/seat allocation, invigilation roster, malpractice logging.
- External exam body candidate registration tracking (BECE/WAEC/NECO).
- Bulk Excel import/export tooling for migration and reporting.
- Full audit trail across all modules, data export/deletion request workflow.

## Phase 3 — Differentiators & polish

Goal: the features that make the product genuinely unique and pleasant to use long-term.

- AI-assisted report card comments (human-in-the-loop).
- Early-warning at-risk student flagging.
- AI chatbot for parent FAQs via WhatsApp.
- USSD short-code fallback for attendance/fee/result checks.
- Offline-first PWA data entry with background sync.
- CBT anti-cheating: lockdown/full-screen enforcement, tab-switch detection, optional webcam snapshot proctoring; item analysis (difficulty/discrimination index).
- Live GPS transport tracking for parents.
- Digital ID with QR gate-scan verification.
- Alumni management (directory, broadcast, giving tracking).
- Performance appraisal cycles, CPD/training tracking (HR).
- Native mobile app (React Native), reusing the existing API layer.

## Sequencing notes

- **Results & report cards (Phase 1) are the make-or-break feature** — get the Nigerian-standard layout, grading flexibility, and approval workflow right before anything else, since it's the single artifact every parent judges the system by every term.
- **Fees (Phase 1 basic, Phase 2 deep)** is the second priority — the school will judge the system largely on whether it actually makes money easier to track.
- Everything in Phase 3 is genuinely optional for a usable product — sequence it based on what would help the school most right now (e.g., if parent engagement via WhatsApp is the biggest pain point, pull the escalating reminders and AI chatbot earlier; if exam security is the bigger concern, pull CBT anti-cheating earlier).
