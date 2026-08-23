# 21 — Build Guide

This is the literal, step-by-step execution plan: what to install, what accounts to create, what order to build things in, and exactly how to prompt an AI coding assistant (Claude Code) for each piece. Read [01-overview.md](01-overview.md) and [02-feature-list.md](02-feature-list.md) first if you haven't — this guide assumes you already know *what* you're building; it's about *how* and *in what order*.

The system is **two separate services**: a **NestJS** backend API and a **Next.js** frontend, talking to each other over REST. See [18-technical-architecture.md](18-technical-architecture.md) for why and how — this doc is the practical "what to actually type" companion to that one.

## 0. How to use this document

- Work through **§3 (Build Order)** top to bottom. Each stage lists what to build **on the API and on the frontend**, which spec doc to feed Claude Code, and a "done when" check.
- **§4 and §5** give you copy-paste-able prompt templates for backend (NestJS) and frontend (Next.js) work respectively — use them as a pattern, swapping in the specific endpoint/screen you're on.
- Don't try to prompt "build the whole admin dashboard" in one go. Every successful prompt below targets **one NestJS module or one frontend screen at a time**. That's not a style preference — Claude Code (and any AI coding tool) produces much more reliable, reviewable code in small slices than in one giant request.
- After every stage: run both services, click through the thing you just built, and commit. Don't stack three stages of unverified code on top of each other.

## 1. Final Tech Stack

### Backend — NestJS (`/api`)

| Concern | Technology | Install |
|---|---|---|
| Framework | NestJS, TypeScript | `npm i -g @nestjs/cli` then `nest new api` |
| Database | PostgreSQL (hosted — Neon or Supabase) | no local install needed |
| ORM | Prisma, wrapped in a `PrismaService` | `npm i prisma @prisma/client` |
| Auth | Passport.js strategies + JWT | `npm i @nestjs/passport @nestjs/jwt passport passport-local passport-jwt bcrypt` |
| Validation | class-validator / class-transformer (DTOs) | `npm i class-validator class-transformer` |
| API docs / typed client source | Swagger (OpenAPI) | `npm i @nestjs/swagger` |
| Background jobs | BullMQ via Nest's module, Redis (Upstash) | `npm i @nestjs/bullmq bullmq ioredis` |
| Scheduled jobs | Nest's schedule module | `npm i @nestjs/schedule` |
| PDF generation | Puppeteer (run inside a queue processor) | `npm i puppeteer` |
| File storage | Supabase Storage or AWS S3 SDK | `npm i @supabase/supabase-js` (or `@aws-sdk/client-s3`) |
| Email | Resend | `npm i resend` |
| SMS | Termii (plain REST via `fetch`/`axios`, no SDK needed) | `npm i axios` |
| Payments | Paystack (plain REST via `fetch`/`axios`) | — |
| Rate limiting | Nest's throttler module | `npm i @nestjs/throttler` |
| Testing | Jest (bundled with Nest) + Supertest (e2e) | bundled |
| Error tracking | Sentry | `npm i @sentry/node` |
| Hosting | Railway, Render, or Fly.io | — |

### Frontend — Next.js (`/web`)

| Concern | Technology | Install |
|---|---|---|
| Framework | Next.js 15 (App Router), TypeScript, React | `npx create-next-app@latest` |
| Styling/UI | Tailwind CSS + shadcn/ui | bundled with create-next-app + `npx shadcn@latest init` |
| Session layer | Auth.js (NextAuth v5), Credentials provider bridging to the NestJS API | `npm i next-auth@beta` |
| API client | A typed client generated from the NestJS OpenAPI spec | `npm i -D openapi-typescript` (or use `orval`) |
| Forms | React Hook Form + Zod | `npm i react-hook-form @hookform/resolvers zod` |
| Data tables/grids | TanStack Table | `npm i @tanstack/react-table` |
| Dates | date-fns | `npm i date-fns` |
| Testing | Vitest (unit) + Playwright (e2e) | `npm i -D vitest playwright @playwright/test` |
| Error tracking | Sentry | `npm i @sentry/nextjs` |
| Hosting | Vercel | — |

You will end up with **three deployable pieces**: the NestJS API (Railway/Render/Fly.io), its queue processors (same codebase, can run in-process initially — see [18-technical-architecture.md](18-technical-architecture.md) §5), and the Next.js app (Vercel).

## 2. Accounts & API Keys Checklist

Set these up **before or during Stage 0** — a few (Paystack business verification, WhatsApp later) take real-world days to approve, so start those early in parallel with coding. The "Lives in" column matters: secrets belong on the API, never on the frontend.

| # | Service | What it's for | Lives in | Needed by | Notes |
|---|---|---|---|---|---|
| 1 | GitHub | Code hosting | — | Day 1 | Free |
| 2 | Vercel | Hosting the Next.js frontend | `/web` | Day 1 | Free tier is enough for one school |
| 3 | Railway, Render, or Fly.io | Hosting the NestJS API + queue workers | `/api` | Day 1 | NestJS is a persistent server, not a serverless function — pick one of these, not Vercel, for the API |
| 4 | Neon or Supabase | PostgreSQL database | `/api` only | Day 1 | Free tier is enough to start; gives you `DATABASE_URL` |
| 5 | Supabase Storage, Cloudinary, or AWS S3 | Student/staff photos, documents, generated PDFs | `/api` only | Stage 3 | Free tier (Supabase/Cloudinary) is enough early on |
| 6 | — (`openssl rand -base64 32`) | JWT signing secret (API) and `NEXTAUTH_SECRET` (frontend) | both — generate two different random strings | Stage 1 | No account — just generate random strings |
| 7 | Upstash | Redis for the job queue | `/api` only | Stage 1 (or whenever you first need a queue, by Stage 5–6) | Free tier is enough |
| 8 | Paystack | Online fee payment | `/api` holds the secret key; `/web` only holds the public key | Stage 6 | **Start business verification early** — needs the school's CAC/bank details and can take a few days; use Paystack **test keys** while building, swap to live keys at launch |
| 9 | Termii | SMS to parents | `/api` only | Stage 7 | Pay-as-you-go per SMS (Nigerian routes); needs a small wallet top-up to send live messages, test mode is free |
| 10 | Resend | Transactional email | `/api` only | Stage 7 | Free tier (3,000 emails/month) covers one school easily |
| 11 | Sentry | Error tracking | both (separate Sentry projects for `/api` and `/web`) | Stage 10 (or earlier) | Free tier is enough |
| 12 | A domain name | e.g. `yourschoolname.ng` or `.com` | — | Before go-live | Optional for development — use the free `*.vercel.app` and `*.up.railway.app` URLs until launch |
| 13 | Flutterwave | Backup/alternative payment gateway | `/api` | Optional, Phase 2 | Skip for MVP — launch with Paystack only |
| 14 | WhatsApp Business API (via Termii/360dialog) | Phase 2 communication channel | `/api` | Phase 2 | Meta business verification takes weeks — start this early if you want it for Phase 2, not Phase 1 |
| 15 | Anthropic API key | AI-assisted comments (Phase 3) | `/api` | Phase 3 | Skip until you're past Phase 1 and 2 |

## 3. Build Order — Stage by Stage

Each stage names the spec doc to keep open/reference while prompting, and a concrete "done when" check so you know when to move on. This follows [20-roadmap-phases.md](20-roadmap-phases.md) Phase 1, in dependency order (each stage needs the one before it). Every stage now has an **API** half and a **Frontend** half — build the API half first, confirm it works (via Swagger's `/api/docs` page or a quick `curl`), then build the frontend half against it.

### Stage 0 — Project Setup (1–2 days)
- Create one GitHub repo with `/api` and `/web` folders (see [18-technical-architecture.md](18-technical-architecture.md) §11).
- **API**: `nest new api`, install the Prisma/Passport/Swagger/BullMQ packages from §1, point `DATABASE_URL` at your Neon/Supabase Postgres, enable CORS for your future Vercel origin.
- **Frontend**: `npx create-next-app@latest`, Tailwind + shadcn/ui init.
- Deploy both empty shells: `/api` to Railway/Render/Fly.io, `/web` to Vercel, frontend pointed at the API's base URL via an env var.
- **Done when**: visiting the API's `/api/docs` (Swagger) shows an empty-but-running API, and the default Next.js page is live on Vercel.

### Stage 1 — Data Model, Auth & RBAC Foundation (1–2 weeks)
- Reference: [18-technical-architecture.md](18-technical-architecture.md) §3–4, [03-roles-and-permissions.md](03-roles-and-permissions.md).
- **API**: write the Prisma schema (`School`, `AcademicSession`, `Term`, `Class`, `Arm`, `Subject`, `ClassSubject`, `Staff`, `Role`, `StaffRole`, `Student`, `Guardian`, `StudentGuardian`, `Enrollment`), run the first migration, write a seed script. Build an `AuthModule`: `POST /auth/login` (Passport local strategy, returns access + refresh JWT), a `JwtStrategy` for protecting routes, and a `RolesGuard` + `@Roles()` decorator.
- **Frontend**: set up NextAuth with a Credentials provider whose `authorize()` calls the API's `/auth/login`; build the login page; build the basic per-role layout shell (sidebar nav + role-based redirect) for Admin, Teacher, Student, Parent.
- **Done when**: you can log in as four different seeded users (via the Next.js login page) and land on four different (empty) dashboards, and a direct `curl` call to an Admin-only endpoint with a Teacher's token is rejected by the API.

### Stage 2 — School Setup & Academic Structure (1–2 weeks)
- Reference: [04-dashboard-school-admin.md](04-dashboard-school-admin.md) §4, [02-feature-list.md](02-feature-list.md) §1 & §5.
- **API**: `SchoolModule`, `AcademicModule` (session/term/class/arm/subject CRUD endpoints), `StaffModule` (staff directory + role assignment, teacher-subject-class assignment).
- **Frontend**: Admin screens for all of the above, calling the new endpoints via the typed client.
- **Done when**: an Admin can, from the UI alone, set up a full academic structure for a new session from scratch.

### Stage 3 — Student Information Management (1–2 weeks)
- Reference: [02-feature-list.md](02-feature-list.md) §3, [19-unique-differentiators.md](19-unique-differentiators.md) §10.
- **API**: `StudentModule` (CRUD, guardian linkage, document upload endpoint wired to object storage), bulk Excel import endpoint.
- **Frontend**: student CRUD screens, bulk import UI.
- **Done when**: you can bulk-import a real (anonymized) class list and every student has a working guardian login.

### Stage 4 — Attendance (3–5 days)
- Reference: [05-dashboard-teacher.md](05-dashboard-teacher.md) §2, [02-feature-list.md](02-feature-list.md) §6.
- **API**: `AttendanceModule` (mark/list endpoints).
- **Frontend**: teacher daily attendance marking screen; attendance summary views for Admin/Parent.
- **Done when**: marking a student absent is visible on the Parent dashboard within seconds (notification wiring can be stubbed/logged until Stage 7).

### Stage 5 — Academics & Results Engine (2–4 weeks — the biggest, most important stage)
- Reference: [14-module-academic-results.md](14-module-academic-results.md) in full.
- **API**: `AssessmentModule` (configurable CA weights), `ScoreModule` (score-entry endpoint with lock-on-submit, grade computation, position-in-subject/position-in-class ranking), `ResultModule` (broadsheet, approval workflow Teacher → Exam Officer → Admin → Publish). Stand up the BullMQ queue now; add a `ReportCardProcessor` that renders the HTML template from [14-module-academic-results.md](14-module-academic-results.md) §6 via Puppeteer and uploads the PDF.
- **Frontend**: score-entry grid, broadsheet view, approval queue screens, report-card view/download.
- **Done when**: you can run a full term-end cycle end to end for a whole seeded class — enter scores as different teachers, collate, approve, publish, and download a correctly laid-out report card PDF as a parent.

### Stage 6 — Fees & Payments (1–2 weeks)
- Reference: [15-module-fees-payments.md](15-module-fees-payments.md) in full, [08-dashboard-bursar.md](08-dashboard-bursar.md).
- **API**: `FeeModule` (fee structure, invoice generation), `PaymentModule` (Paystack checkout-session endpoint, a `/webhooks/paystack` endpoint that **verifies the signature** before trusting it, manual payment recording, PDF receipt job), defaulters list endpoint.
- **Frontend**: fee structure setup, invoice views, "Pay Now" flow (Paystack's client-side widget using the **public** key only), defaulters list.
- Use Paystack **test mode** for all of this; switch to live keys only at go-live.
- **Done when**: a parent can pay a real test transaction via Paystack and see their invoice balance update and a receipt appear, with zero manual steps from the Bursar.

### Stage 7 — Communication (3–5 days)
- Reference: [16-module-communication.md](16-module-communication.md) §1–7.
- **API**: `CommunicationModule` (notice CRUD, SMS-send via Termii, email-send via Resend, targeted broadcast), wire the Stage 4/6 stub notifications (absence alert, fee reminder) into real sends.
- **Frontend**: notice board, broadcast composer.
- **Done when**: marking a student absent actually sends a real SMS to the parent's phone.

### Stage 8 — Parent & Student Dashboard Polish (1 week)
- Reference: [07-dashboard-parent.md](07-dashboard-parent.md), [06-dashboard-student.md](06-dashboard-student.md).
- **Frontend only**: multi-child switcher, performance trend view, assignments view, mobile responsiveness pass (most parents will use this on a phone).
- **Done when**: every screen listed in both docs exists and works on a small mobile viewport.

### Stage 9 — Discipline, Calendar & Documents (3–5 days)
- Reference: [02-feature-list.md](02-feature-list.md) §17, §19, §20.
- **API + Frontend**: discipline incident logging, school calendar/events, testimonial/certificate PDF generation (reuses the Stage 5 PDF pipeline).
- **Done when**: these three smaller P1 features all work, even simply.

### Stage 10 — Hardening, Testing & Go-Live (1–2 weeks)
- See §8 and §9 below — note the extra two-service deployment steps (CORS, two sets of env vars, two health checks).

**Phase 1 total**: roughly **9–13 weeks of stages** — see §7 for a realistic calendar-time estimate, since stage-weeks and calendar-weeks are not the same thing once you account for your actual available hours.

**Phase 2 and 3**: once Phase 1 is live and the school is actually using it, come back to [20-roadmap-phases.md](20-roadmap-phases.md) for CBT, Library, HR/Payroll, Transport, Hostel, WhatsApp, and the AI differentiators — same stage-by-stage, API-then-frontend approach, one module at a time.

## 4. How to Prompt Claude Code — Backend (NestJS)

The pattern that works: **name the doc + section, name the exact module/endpoint, name the DTO/validation/role-guard rule.** Don't describe the UI in a backend prompt — keep them separate.

```
In the NestJS app, add Prisma models for School, AcademicSession, Term, Class, Arm,
Subject, ClassSubject, Staff, Role, StaffRole, Student, Guardian, StudentGuardian,
and Enrollment. Use the relationships described in docs/18-technical-architecture.md
section 3. Generate a migration and write a seed script with realistic sample data:
3 classes (JSS1, JSS2, SSS1), 2 arms each, 6 subjects, 5 staff with different roles,
20 students with guardians.
```

```
Build an AuthModule: a POST /auth/login endpoint using Passport's local strategy
that validates email+password against the Staff/Student/Guardian tables, and on
success issues a short-lived JWT access token and a longer-lived refresh token
containing the user's id and role(s). Add a JwtStrategy for validating the access
token on protected routes, and a RolesGuard + @Roles() decorator that checks the
token's roles against what the decorator requires. Add a test proving a request
with no token, an expired token, and a wrong-role token are all rejected.
```

```
Build a ScoreModule with a POST /scores/submit endpoint, guarded with
@Roles('SUBJECT_TEACHER'). Accept a DTO: classSubjectId, termId, and a list of
{studentId, assessmentComponentId, score}. Validate each score against that
component's max (class-validator), validate the caller is the assigned teacher for
that ClassSubject (query TeacherAssignment, don't trust the request body), and
upsert Score rows in a transaction. Reject the whole batch if the term's
score-entry deadline has passed, per docs/14-module-academic-results.md section 3,
unless the caller has the EXAM_OFFICER or ADMIN role performing an authorized
unlock — log unlocks to the AuditLog model.
```

```
Build a PaymentModule: a POST /payments/checkout endpoint that creates a Paystack
transaction for a given invoiceId and returns the checkout URL (using the secret
key, server-side only), and a POST /webhooks/paystack endpoint that verifies the
Paystack webhook signature header before trusting the payload, marks the matching
Invoice as paid/partially paid, creates a Payment record, and enqueues a
receipt-PDF job via the BullMQ queue. Reference docs/15-module-fees-payments.md
sections 4 and 10. Add a test proving a webhook call with an invalid signature is
rejected before touching the database.
```

```
Add @nestjs/swagger to the app and decorate the ScoreModule's controller and DTOs
so the OpenAPI spec at /api/docs accurately describes the submit-scores endpoint,
including the 403 response for a wrong-role caller.
```

## 5. How to Prompt Claude Code — Frontend (Next.js)

Same pattern: **name the doc, name the exact screen, name which API endpoint it calls, call out mobile if relevant.**

```
Set up NextAuth (Auth.js v5) with a Credentials provider. Its authorize() function
should POST to the NestJS API's /auth/login endpoint with the submitted
email/password, and on success return a user object containing the access token
and role(s) so they end up in the session. Add middleware that redirects an
unauthenticated user to /login and redirects a logged-in user away from /login to
the dashboard matching their role.
```

```
Generate a typed API client from the NestJS OpenAPI spec at <api-url>/api/docs-json
using openapi-typescript, and create a small `apiFetch` wrapper that attaches the
Authorization: Bearer header from the current NextAuth session automatically.
```

```
Build the Teacher score-entry screen at app/teacher/scores. Show a class+subject
picker limited to what the logged-in teacher is assigned to (call GET
/teachers/me/assignments), then a spreadsheet-style grid using TanStack Table:
rows = students, columns = this term's assessment components, inline numeric
inputs, a live-computed Total and Grade column, and a Submit button that calls
POST /scores/submit and locks the row on success. Reference
docs/05-dashboard-teacher.md section 4 for exact behavior.
```

```
Build the Parent dashboard home at app/parent/page.tsx. If the logged-in guardian
has more than one child, show a child switcher at the top. Below it, show three
cards: today's attendance status, current term fee balance with a "Pay Now"
button, and the 3 most recent notices — each card calling its respective API
endpoint. This must look good on a 375px-wide mobile screen — most parents will
open this on a phone. Reference docs/07-dashboard-parent.md.
```

```
Build the report card view at app/student/report-card and app/parent/report-card.
Fetch the published Term Result for the selected child/term from GET
/results/:studentId/:termId and render an HTML preview that matches the layout in
docs/14-module-academic-results.md section 6 exactly (subject table with CA/Exam
breakdown, affective/psychomotor ratings, form teacher's and principal's comments,
attendance summary). Add a "Download PDF" button that links to the
already-generated PDF URL returned by the API.
```

## 6. General Prompting Tips

- **One NestJS module or one screen per prompt.** "Build the admin dashboard" produces shallow, hard-to-review code. "Build the class CRUD endpoints" produces something you can actually test in two minutes via Swagger.
- **Always point at the doc section.** Claude Code can open and read `docs/*.md` directly — referencing `docs/14-module-academic-results.md section 6` gets you the exact Nigerian report-card layout instead of a generic one.
- **State the guard/role rule explicitly**, even though it's in the roles doc — backend prompts that don't mention "guard with @Roles(...) and verify against the assignment table" are the ones that ship with a security hole.
- **Ask for a test when the logic is non-trivial** (grading, ranking, payment webhooks, auth) — "add a test that proves X" catches mistakes before a parent does.
- **Regenerate the typed frontend client whenever the API's DTOs change** — don't let the frontend drift from hand-typed guesses about the response shape.
- **Use plan mode for anything touching more than 2-3 files** so you can review the approach before code gets written.
- **Commit after every working stage**, in both `/api` and `/web`. If a prompt goes sideways, you want a clean point to roll back to.
- **Don't batch unrelated changes.** If you notice an unrelated bug while building a new screen, fix it in its own prompt/commit, not bundled in.

## 7. Timeline Estimate

The stage list in §3 is in **stage-weeks**, not calendar-weeks — how long it actually takes depends entirely on how many hours a week you can put in. Both columns below assume you're using Claude Code to pair-program (not writing every line by hand) and have basic comfort running terminal commands and reviewing diffs. These estimates already account for the extra overhead of building two services instead of one (auth bridge, CORS, typed-client generation, two deploy targets).

| Stage | Full-time (~35 hrs/wk) | Part-time (~12 hrs/wk) |
|---|---|---|
| 0 — Project setup (both services) | 1–2 days | 3–4 days |
| 1 — Data model, auth bridge, RBAC | 1.5 weeks | 3 weeks |
| 2 — School/academic setup | 1 week | 2 weeks |
| 3 — Student records + import | 1 week | 2 weeks |
| 4 — Attendance | 3 days | 1 week |
| 5 — Results engine + report cards | 2–3 weeks | 5–6 weeks |
| 6 — Fees & payments | 1.5 weeks | 3 weeks |
| 7 — Communication | 3–4 days | 1 week |
| 8 — Parent/Student polish | 1 week | 2 weeks |
| 9 — Discipline/Calendar/Docs | 3–4 days | 1 week |
| 10 — Hardening/testing/launch (two services) | 1.5–2 weeks | 3 weeks |
| **Phase 1 total** | **~10–12 weeks (≈2.5–3 months)** | **~23–28 weeks (≈5.5–6.5 months)** |

Phase 2 (CBT, Library, HR/Payroll, Transport, Hostel, WhatsApp) adds roughly another **5–7 weeks full-time / 12–16 weeks part-time** on top, and is meant to come *after* Phase 1 is live and the school is actually using it day to day — not before.

**If you want something in front of the school faster**: cut Stage 6 (online payments) down to "manual payment recording only, no Paystack yet" and skip Stage 7's SMS until later — that alone can take 3–4 weeks off Phase 1, with online payment and SMS reminders following a few weeks after launch instead of blocking it.

## 8. Testing Checklist

Before treating any stage as "done":
- [ ] Every NestJS endpoint that writes data has a `@Roles()` guard, verified by at least one e2e test that calls it as the *wrong* role and expects a 403.
- [ ] The full results cycle (Stage 5) has been run end-to-end with at least 2 teachers, 1 exam officer, and 1 admin account, on a seeded class of 10+ students, and the report card PDF was visually checked against [14-module-academic-results.md](14-module-academic-results.md) §6.
- [ ] Paystack webhook handler rejects a request with an invalid/missing signature.
- [ ] Bulk Excel import has been tried with a real (anonymized) messy spreadsheet, not just a clean test file.
- [ ] Every parent/student-facing screen has been checked on an actual mobile device (not just a resized browser window), since that's how most parents will use it.
- [ ] A staff member is deactivated and immediately loses access (refresh-token revocation works on the API, not just "hidden from the frontend UI").
- [ ] CORS is locked down to the actual frontend origin(s) — not left wide open (`*`) once real student data is involved.
- [ ] The frontend's environment variables contain no secret keys — only the API base URL and public-facing keys (e.g. Paystack's public key).

## 9. Go-Live Checklist (for this one school)

- [ ] Real student/staff/guardian data imported (via Stage 3's bulk import), reviewed for accuracy by the Admin before students/parents get login credentials.
- [ ] Paystack switched from test keys to live keys on the API, and a real ₦100 test payment confirmed end-to-end before announcing it to parents.
- [ ] Staff trained on their specific dashboard (a 30–60 minute walkthrough per role, using [04](04-dashboard-school-admin.md)–[13](13-dashboard-front-desk-security.md) as the training script).
- [ ] Run one full term in parallel with the school's existing paper/Excel process before fully cutting over, so there's a fallback if something is wrong with a report card or fee balance.
- [ ] Backups confirmed working (take a backup, restore it somewhere, confirm the data matches) before real student data goes in — see [18-technical-architecture.md](18-technical-architecture.md) §8.
- [ ] Both services' health checks pass in production (API `/health` endpoint, frontend loads), and both have a custom domain with SSL confirmed working.
