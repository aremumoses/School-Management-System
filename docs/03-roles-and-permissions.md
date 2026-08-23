# 03 — Roles & Permissions

## 1. Roles in the System

| Role | Scope | Typical user |
|---|---|---|
| **School Admin (Principal)** | Whole school — top of the permission tree | Principal, head of school, proprietor |
| **Vice Principal / Assistant Admin** | Whole school, delegated | VP Academics, VP Administration |
| **Head of Department (HOD)** | One department, across classes | Subject department head |
| **Class Teacher / Form Master** | One class/arm | Form teacher |
| **Subject Teacher** | Assigned subjects/classes | Any teaching staff |
| **Exam Officer** | Exams & results, school-wide | Exams officer |
| **Bursar / Accountant** | Finance, school-wide | Bursar, accounts officer |
| **Librarian** | Library | Librarian |
| **Hostel Warden / Matron** | Boarding house | House master/mistress |
| **Transport Officer** | Buses & routes | Transport coordinator |
| **HR Officer** | Staff records | HR/admin officer |
| **Front Desk / Security** | Gate, visitors | Receptionist, gatekeeper |
| **Student** | Own record only | JSS1–SSS3 student |
| **Parent / Guardian** | Own ward(s) only | Parent/guardian |
| **IT Support (internal)** | School-level technical config | School's internal IT person |

A user can hold **more than one role** (e.g., a Subject Teacher who is also a Class Teacher, or a Vice Principal who is also Exam Officer). Roles are additive — permissions are the union of all assigned roles.

The **School Admin (Principal)** is the single highest authority in the system — there is no layer above it (no multi-branch/proprietor console), since this build is for one school only. See [01-overview.md](01-overview.md) §4.

## 2. Permission Matrix

Legend: **F** = Full (create/edit/delete/approve), **E** = Edit own scope, **V** = View only, **A** = Approve step in a workflow, **–** = No access.

| Module | School Admin | VP/Asst Admin | HOD | Class Teacher | Subject Teacher | Exam Officer | Bursar | Librarian | Hostel Warden | Transport Officer | HR Officer | Front Desk | Student | Parent |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| School setup | F | V | – | – | – | – | – | – | – | – | – | – | – | – |
| Admissions | F | E | – | – | – | – | – | – | – | – | V | – | E (apply) |
| Student records | F | E | V | V (own class) | V (own students) | V | V (fee-linked) | V | V (boarders) | V (route users) | – | V | E (own) | V (own ward) |
| Staff/HR records | F | E | V (own dept) | – | – | – | – | – | – | – | F | – | – | – |
| Class/Subject/Timetable setup | F | E | E (own dept) | V | V | V | – | – | – | – | – | – | V | V |
| Attendance | F | V | V | E (own class) | E (own period) | V | – | – | E (boarders) | E (transport) | – | – | V (own) | V (own ward) |
| CA & Exam score entry | A | A | A (own dept) | V | E (own subject) | F | – | – | – | – | – | – | V (own) | V (own ward) |
| Result approval & publishing | F | A | A | – | – | F | – | – | – | – | – | – | V (own) | V (own ward) |
| Report cards | A | V | V | V (own class) | V (own subject) | F | – | – | – | – | – | – | V (own) | V (own ward) |
| CBT/Exam engine | V | V | V | – | E (own subject) | F | – | – | – | – | – | – | E (take test) | – |
| Fees & invoicing | V | V | – | – | – | – | F | – | – (transport fee link) | – | – | V (own) | V (own ward, pay) |
| Communication/broadcast | F | E | E (own dept) | E (own class) | E (own class) | E (exam notices) | E (fee notices) | E (library notices) | E (boarders) | E (transport) | E (staff notices) | E (visitor notices) | V | V |
| Library | V | V | – | – | – | – | – | F | – | – | – | – | E (own loans) | V (own ward) |
| Hostel | V | V | – | – | – | – | – | – | F | – | – | – | V (own, if boarder) | V (own ward) |
| Transport | V | V | – | – | – | – | – | – | – | F | – | – | V (own) | V (own ward) |
| Discipline | F | E | V (own dept) | E (own class) | E (own subject, log only) | V | – | – | E (boarders) | – | – | V | V (own, read-only) | V (own ward) |
| Front desk/visitor log | V | V | – | – | – | – | – | – | – | – | – | F | – | – |
| Calendar/events | F | E | V | V | V | V | V | V | V | V | V | V | V | V |
| Documents/certificates | F | E | – | – | – | – | – | – | – | – | – | – | V (own) | V (own ward) |
| Analytics & reports | F | V | V (own dept) | V (own class) | V (own subject) | F (academic) | F (financial) | V (library) | V (hostel) | V (transport) | V (HR) | – | – | – |
| System settings | F | – | – | – | – | – | – | – | – | – | – | – | – | – |
| Audit log | F | – | – | – | – | – | – | – | – | – | – | – | – | – |

## 3. Role-specific notes

- **School Admin (Principal)** has full operational authority within the school, including final result publishing approval (or delegating that to the Exam Officer with their own sign-off retained as the final gate).
- **Parents and Students never get write access to academic or financial records** — they are consumers of data, with the only write actions being: fee payment, profile contact-detail updates, consent-form e-signing, messaging, and event RSVP.
- **Subject Teachers** can only edit scores for subjects/classes they are explicitly assigned to teach — enforced server-side, not just hidden in the UI.
- **Class Teachers** see all subjects for their class (read) but only edit attendance and conduct/affective-domain ratings for their class — subject scores remain owned by the subject teacher.
- A **lock window** applies to CA/exam score entry: once the term's submission deadline passes (or once approved by Exam Officer), Subject Teachers lose edit rights and must request an unlock from the Exam Officer/Admin (logged in the audit trail).

## 4. Authentication model

- Each role logs in through the same unified login screen; the system routes to the correct dashboard based on role after authentication.
- **Students and Parents** are typically invited via the school (auto-generated credentials sent by SMS/email on enrollment) rather than self-registering, to keep the school's data closed to outsiders.
- **Staff** accounts are created by School Admin/HR, never self-registered.
- See [18-technical-architecture.md](18-technical-architecture.md) §4 for the auth implementation (NextAuth/Auth.js, RBAC middleware).
