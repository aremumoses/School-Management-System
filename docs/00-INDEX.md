# School Management System (SMS) — Documentation Index

This is the full functional specification for a **School Management System** built with **Next.js (frontend)** and **NestJS (backend API)**, for **one secondary school in Lagos, Nigeria** (JSS1–SSS3).

This is a single-school build, not a multi-school SaaS product — there is one school, one Admin/Principal at the top of the permission tree, and no proprietor/multi-branch layer above that. See [01-overview.md](01-overview.md) §4.

## How to read this, in order

The documents are numbered in the order you should read (and build) them:

1. **00–03**: what the system is and who uses it (read these first, no build order implied).
2. **04–13**: one document per dashboard/role — read the one for whatever you're building next.
3. **14–17**: the shared engines that power several dashboards at once (results, fees, comms, CBT).
4. **18–20**: how it's built, what makes it different, and the phase plan.
5. **21**: the actual step-by-step build guide — tech stack, accounts/API keys to create, build order, example prompts, and a timeline. **Start here once you're ready to write code.**

## Documents

| # | Document | Purpose |
|---|---|---|
| 00 | [Index](00-INDEX.md) | This page |
| 01 | [Overview & Vision](01-overview.md) | Problem statement, target users, Nigerian regulatory context, scope, assumptions |
| 02 | [Master Feature List](02-feature-list.md) | Exhaustive checklist of every feature in the system, grouped by category |
| 03 | [Roles & Permissions](03-roles-and-permissions.md) | Every user role in the system and a full permission matrix |
| 04 | [School Admin / Principal Dashboard](04-dashboard-school-admin.md) | The operational command center — top of the permission tree |
| 05 | [Teacher Dashboard](05-dashboard-teacher.md) | Classroom, scoring, lesson notes, assignments |
| 06 | [Student Dashboard](06-dashboard-student.md) | Student-facing portal |
| 07 | [Parent/Guardian Dashboard](07-dashboard-parent.md) | Parent-facing portal & engagement tools |
| 08 | [Bursar / Accountant Dashboard](08-dashboard-bursar.md) | Fees, billing, payments, financial reporting |
| 09 | [Exam Officer Dashboard](09-dashboard-exam-officer.md) | Exam scheduling, CBT admin, result collation & approval |
| 10 | [Librarian Dashboard](10-dashboard-librarian.md) | Library catalog, circulation, digital resources |
| 11 | [Hostel & Transport Dashboard](11-dashboard-hostel-transport.md) | Boarding house and school bus management |
| 12 | [HR / Staff Dashboard](12-dashboard-hr-staff.md) | Staff records, payroll, leave, appraisal |
| 13 | [Front Desk / Security Dashboard](13-dashboard-front-desk-security.md) | Visitor log, gate pass, pickup verification |
| 14 | [Academics & Results Module](14-module-academic-results.md) | CA/exam scoring engine, grading scale, report cards, promotion logic |
| 15 | [Fees & Payments Module](15-module-fees-payments.md) | Billing engine, payment gateways, reconciliation |
| 16 | [Communication Module](16-module-communication.md) | SMS, WhatsApp, email, push, USSD |
| 17 | [CBT & Examination Engine](17-module-cbt-examination.md) | Computer-based testing, question banks, anti-cheating |
| 18 | [Technical Architecture](18-technical-architecture.md) | Next.js + NestJS stack, single-school data model, integrations, security |
| 19 | [Unique Differentiators](19-unique-differentiators.md) | The "added advantage" features that make this product unique |
| 20 | [Roadmap & Phases](20-roadmap-phases.md) | MVP, Phase 2, Phase 3 feature-level build plan |
| 21 | [Build Guide](21-build-guide.md) | Step-by-step execution plan: stack, API keys, build order, prompts, timeline |

## Naming placeholder

This documentation refers to the product simply as **"the System"** or **"SMS"** throughout — replace with your chosen product name once decided.
