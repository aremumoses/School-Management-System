# 01 — Overview & Vision

## 1. Problem Statement

Most secondary schools in Lagos and across Nigeria still run on a patchwork of paper registers, Excel sheets, WhatsApp broadcast lists, and manually-typed report cards. This creates recurring, costly problems:

- **Admissions** are handled on paper or via phone calls, with no central record of applicants, entrance exam scores, or admission status.
- **Attendance** is taken on paper registers that are never aggregated, so chronic absenteeism goes unnoticed until it's a crisis.
- **Continuous Assessment (CA) and exam scores** are computed by hand or in disconnected Excel files per subject, making term-end report card production slow, error-prone, and stressful for teachers and exam officers (often taking days of manual collation, especially for the "position in class" calculation).
- **Fee collection** is hard to track — the school often doesn't know in real time who has paid, who is owing, and what its true cash position is. Reconciling cash, bank transfers, and POS payments is manual.
- **Parent communication** is fragmented across WhatsApp groups, SMS, and phone calls, with no record of what was sent to whom, and no read/delivery confirmation.
- **WAEC/NECO/BECE/JAMB administrative work** — registering candidates, tracking continuous assessment scores that feed into BECE, generating the data exports examination bodies require — is manual and repetitive every year.
- **Exam malpractice** is a constant concern, and most schools have no computer-based testing (CBT) infrastructure, even though WAEC, NECO, and JAMB have moved heavily toward CBT.
- **No analytics** — the principal/proprietor has no dashboard showing trends in performance, attendance, fee collection, or staff productivity across terms and sessions.

The System exists to replace this patchwork with one connected platform that every stakeholder at the school — principal, teacher, bursar, exam officer, student, and parent — logs into for their part of the school's operation.

This is being built for **one specific secondary school**, not as a multi-school SaaS product — every design decision in this documentation assumes a single school, single set of classes, single fee structure, and one Admin/Principal at the top of the permission tree. See [03-roles-and-permissions.md](03-roles-and-permissions.md) for the full role breakdown and [18-technical-architecture.md](18-technical-architecture.md) for how this simplifies the data model.

## 2. Target Users

- **Principal / School Admin** — runs day-to-day operations and has the final word on everything in the system
- **Vice Principals / Assistant Admins**
- **Heads of Department (HODs)**
- **Class Teachers / Form Masters/Mistresses**
- **Subject Teachers**
- **Exam Officers**
- **Bursars / Accountants**
- **Librarians**
- **Hostel Wardens / Matrons** (boarding schools)
- **Transport Officers**
- **HR / Admin Officers**
- **Front Desk / Security / Gatekeepers**
- **Students** (JSS1 – SSS3)
- **Parents / Guardians**

See [03-roles-and-permissions.md](03-roles-and-permissions.md) for the full breakdown.

## 3. Geographic & Regulatory Context

The System is designed first for **Lagos State**, then generalizable to all of Nigeria. This shapes specific product decisions:

- **Curriculum alignment**: Nigerian secondary curriculum follows the **6-3-3-4 / 9-3-4** structure — Junior Secondary School (JSS1–JSS3) and Senior Secondary School (SSS1–SSS3), aligned to **NERDC** (Nigerian Educational Research and Development Council) scheme of work.
- **External examinations**: **BECE** (Basic Education Certificate Examination) at JSS3, **WAEC**, **NECO**, **NABTEB** at SSS3, and **JAMB UTME** (CBT-based) for university admission. The System should support candidate registration tracking, CA-to-WAEC/NECO score mapping, and JAMB-style CBT mock practice.
- **Regulatory bodies**: Lagos State Ministry of Education, Lagos State Universal Basic Education Board (SUBEB) for junior secondary in public schools, and the Federal Ministry of Education for national policy. Private schools must also be mindful of state approval/registration numbers, which the System should be able to store and print on official documents (report cards, certificates).
- **Academic calendar**: **Three terms per session** — First Term (~September–December), Second Term (~January–April), Third Term (~April/May–July). All academic, fee, and reporting structures key off **Session → Term**, not semesters.
- **Grading culture**: Nigerian secondary report cards traditionally include not just subject scores but **affective and psychomotor domain ratings** (punctuality, neatness, leadership, sports, handling of tools, etc.) — see [14 — Academics & Results Module](14-module-academic-results.md).
- **Data protection**: Nigeria Data Protection Act (NDPA) 2023 and the NDPR (Nigeria Data Protection Regulation) govern how the System must handle personal data, especially data belonging to minors (students) — see [18-technical-architecture.md](18-technical-architecture.md) §8.
- **Payments**: Nigerian-specific payment rails — **Paystack**, **Flutterwave**, **Remita** (common for institutional/government collections), bank transfer with auto-reconciliation, and POS support for in-person payment at the bursary.
- **Communication**: SMS and WhatsApp dominate parent communication in Nigeria due to data-cost sensitivity; **Termii**, **Africa's Talking**, **KudiSMS**, and **BulkSMSNigeria** are common local SMS gateways the System should integrate with, alongside **WhatsApp Business API**.

## 4. Scope

This is an **internal system for one school** — not a product being sold to other schools. That single decision simplifies almost everything downstream:

- No subscription tiers, no billing-per-school, no feature-flagging by plan — every feature in [02-feature-list.md](02-feature-list.md) is just "on" or "not built yet."
- No multi-tenancy in the database — one school record, one set of settings, one academic calendar.
- No need for a Super Admin/proprietor layer above the Principal — the **School Admin (Principal)** role is the top of the permission tree (see [03-roles-and-permissions.md](03-roles-and-permissions.md)).

If the school later wants to license this software to other schools, that would be a deliberate future re-architecture (multi-tenancy, billing, a proprietor-level dashboard) — not something this build needs to carry the cost of now.

## 5. Assumptions Made in This Documentation

To keep the spec concrete, the following assumptions are made — flag any that don't match your intent so the relevant docs can be adjusted:

1. **Single school, single tenant** — one school record, one academic calendar, one fee structure at a time.
2. The System supports **both day and boarding** operation — hostel/transport modules are present but toggle-able in settings, since not every school runs both.
3. **Grading scales and CA weighting are configurable** (e.g., CA = 40%, Exam = 60%, or the school's own split), because the school may want to tune its own internal policy even though WAEC's A1–F9 scale is the external standard.
4. **Next.js powers the frontend; NestJS powers the backend API** as a separate service — see [18-technical-architecture.md](18-technical-architecture.md) for the full stack decision and reasoning, including how the two talk to each other, database, auth, file storage, and background jobs.
5. The platform name is a placeholder ("the System") — to be finalized.

## 6. Unique Selling Points (summary)

Full detail in [19-unique-differentiators.md](19-unique-differentiators.md). Headline points:

- WhatsApp-first and USSD-fallback parent communication (works even without a smartphone or data).
- AI-assisted report card comments and early-warning performance alerts (human-in-the-loop).
- Offline-first classroom data entry (attendance, CA scores) that syncs when connectivity returns — built for Nigerian network realities.
- Built-in CBT engine with anti-cheating measures and JAMB-style mock practice.
- Affective/psychomotor rating templates matching the Nigerian secondary report card standard out of the box.

## 7. How to Actually Build This

[21-build-guide.md](21-build-guide.md) is the step-by-step execution plan — tech stack, accounts/API keys to set up, build order, example prompts for frontend/backend work, and a timeline estimate. Read this overview and the feature list first so the build guide's steps make sense in context.
