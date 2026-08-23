# 18 — Technical Architecture

This translates the functional spec into a concrete build using **Next.js for the frontend** and **NestJS for the backend API**, as two separate services that talk to each other over REST. Because this is being built for **one school only** (not a multi-tenant SaaS product — see [01-overview.md](01-overview.md) §4), the architecture below is deliberately simpler than a typical multi-school platform would need: no tenant isolation, no subdomain routing, no per-customer billing.

A fully concrete, step-by-step version of all of this — in build order, with exact commands and prompts — is in [21-build-guide.md](21-build-guide.md). This document explains the *decisions*; that one tells you *what to do, in order*.

## 1. High-Level Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | **Next.js (App Router)** + React + Tailwind CSS + shadcn/ui | Fast iteration, good defaults for the forms/tables this app is full of |
| Backend API | **NestJS** (modular REST API: controllers, services, modules) | Structured, batteries-included Node framework — built-in dependency injection, Guards for RBAC, a clean module-per-feature shape that maps directly onto this spec's modules (Academics, Fees, Communication, CBT, etc.) |
| Frontend ↔ Backend contract | **REST + OpenAPI (Swagger)**, with a typed client generated from the spec | NestJS auto-generates an OpenAPI spec from its controllers/DTOs; running that through a generator (e.g. `openapi-typescript` or `orval`) gives the Next.js app typed `fetch` calls without hand-written API contracts |
| Database | **PostgreSQL** | Relational integrity matters a lot here (grades, fees, attendance all need strict consistency) |
| ORM | **Prisma**, used inside NestJS via a `PrismaService` | Type-safe queries, good migration story; lives entirely on the backend — the frontend never talks to the database directly |
| Auth | **NestJS** issues JWTs (Passport.js strategies); **Next.js** uses **Auth.js (NextAuth)** as a thin session layer in front of it | See §4 — keeps Next.js's session/middleware ergonomics while NestJS remains the one source of truth for credentials and roles |
| File storage | **S3-compatible object storage** (AWS S3, Cloudinary, or Supabase Storage), accessed from the backend | Student/staff photos, documents, CBT image attachments, generated PDFs |
| Background jobs / queue | **NestJS's built-in `@nestjs/bullmq` module**, backed by Redis | Nest has first-class queue support — no separate framework needed for PDF batch generation, bulk SMS/email, and scheduled jobs (see §5) |
| PDF generation | **Puppeteer**, run inside a NestJS queue processor | Needed for report cards, receipts, certificates, transcripts |
| Caching / rate limiting | **Redis**, plus NestJS's `@nestjs/throttler` | Session/data caching, rate-limiting login & payment webhook endpoints |
| Real-time | **Pusher/Ably or WebSockets** (NestJS has a WebSocket gateway module) | Live notifications (attendance alerts, chat, payment confirmation toasts) |
| Hosting | **Vercel** for the Next.js frontend; **Railway, Render, or Fly.io** for the NestJS API (and its queue workers) | Vercel is ideal for Next.js; NestJS is a persistent Node server, not a serverless function, so it needs a host built for that |
| Observability | **Sentry** (errors, on both services) + structured logging | Catch and trace bugs before a parent or teacher reports them |
| CI/CD | **GitHub Actions** → Vercel (frontend) + the API host (backend) | Two separate deploy pipelines, one repo (see §11) |

## 2. Single-School Data Model

Because there is only ever **one school**, the data model has no tenant/branch layer at all — there is exactly one `School` settings row (name, logo, address, registration number, motto, colors, current session/term, grading scale config), and every other table just relates down from there. This removes a whole category of complexity a multi-tenant build would need (no `school_id` scoping on every query, no Row-Level Security policies, no per-tenant resolution).

This is the single biggest reason the build is faster and cheaper than the general spec elsewhere in this documentation might otherwise imply — skip any instruction you encounter that talks about "branches," "tenants," or a "Super Admin" layer above the Principal; none of that applies here.

## 3. Frontend ↔ Backend Contract

This is the one genuinely new concern that comes from splitting into two services (a single full-stack Next.js app wouldn't need this section at all):

- **NestJS is the only thing that talks to the database.** The Next.js app never imports Prisma or holds a `DATABASE_URL` — it only ever calls the NestJS API over HTTP.
- **Every NestJS controller method gets a DTO** (validated with `class-validator`) for its input, and NestJS's Swagger module (`@nestjs/swagger`) auto-generates an OpenAPI spec from those DTOs and controllers.
- **Generate a typed client for the frontend** from that OpenAPI spec (`openapi-typescript` or `orval`) instead of hand-writing `fetch` calls and re-typing the response shapes — regenerate it whenever the API changes, so the frontend gets a compile error instead of a runtime surprise when a field is renamed.
- **CORS**: the NestJS app must explicitly allow the Next.js app's origin (its Vercel URL / custom domain) — this is a real configuration step that a single-codebase Next.js app wouldn't need, don't forget it when deploying.
- **Environment boundary**: secrets like `DATABASE_URL`, the JWT signing secret, Paystack/Termii/Resend secret keys, and the S3/storage credentials live **only** in the NestJS app's environment. The Next.js app's environment only ever holds the API's base URL, `NEXTAUTH_SECRET`, and any **public** keys (e.g. Paystack's public key, used client-side to open the checkout widget).

## 4. Authentication & Authorization

The pattern: **NestJS owns identity and roles; Next.js owns the session UX.**

- **NestJS** implements login with Passport.js (`passport-local` for email/password, `passport-jwt` for verifying subsequent requests), hashes passwords with bcrypt/argon2, and on successful login issues a short-lived **access token** (JWT, containing the user's id and role(s)) plus a longer-lived **refresh token**.
- **Next.js** uses **Auth.js (NextAuth)** with a **Credentials provider** whose `authorize()` function calls the NestJS `/auth/login` endpoint. On success, NextAuth stores the Nest-issued access token (and the user's role) inside its own session/JWT — so the rest of the Next.js app keeps using normal NextAuth patterns (`useSession()`, middleware-based route protection) without knowing the backend is a separate service.
- Every Server Component/Server Action/API call from Next.js to NestJS attaches `Authorization: Bearer <accessToken>` read out of the NextAuth session.
- **Role-Based Access Control (RBAC) is enforced in NestJS, server-side, on every request** — via a `RolesGuard` + a `@Roles(...)` decorator on each controller method, checked against the permission matrix in [03-roles-and-permissions.md](03-roles-and-permissions.md). Next.js may also hide UI it knows a role can't use, but that's a UX nicety, never the actual gate — assume any request can be replayed directly against the NestJS API by someone who knows what they're doing, and guard accordingly.
- **Session strategy**: short-lived access tokens (e.g. 15 minutes) with a refresh-token flow, so a revoked/offboarded staff member loses access quickly rather than waiting out a long-lived token.
- **Student/Parent accounts** are provisioned by the school (not self-registered) — credentials delivered via SMS/email on enrollment.

## 5. Background Jobs

The reasons background jobs are needed haven't changed — sending bulk SMS/WhatsApp/email, generating hundreds of report-card PDFs at term-end in one batch, and scheduled jobs (term-start invoice generation, daily fee-reminder escalation checks) all need to happen off the request/response cycle.

**Solution**: NestJS's `@nestjs/bullmq` module, backed by Redis:
- Controllers **enqueue** a job and return immediately (e.g. "generate report cards for class X" returns instantly; the actual PDF rendering happens in a queue processor).
- `@Processor()` classes do the heavy lifting — PDF generation, bulk messaging — asynchronously, with status reported back to the frontend via the real-time channel or a polling endpoint.
- `@nestjs/schedule` handles cron-style recurring jobs (the daily fee-reminder escalation check, nightly attendance rollups) directly inside the same NestJS app — no separate scheduler needed.
- For a single school's traffic volume, the queue processors can run in the **same NestJS process** as the API for Phase 1 (simplest to deploy); splitting them into a separate worker instance of the same codebase is a one-line deployment change later if needed, not an architecture change.

## 6. PDF Generation

- Report cards, receipts, certificates, transcripts: rendered as an HTML template inside a NestJS service, converted to PDF via **Puppeteer**, run inside a queue processor (§5) rather than blocking the request — see [14-module-academic-results.md](14-module-academic-results.md) §6 for the report card's exact layout.
- Generated PDFs are uploaded to object storage by the backend, and the resulting URL is saved on the relevant record (Invoice → Receipt, Term Result → Report Card) for the frontend to fetch.

## 7. Mobile / Offline Support

- The Next.js app is built as an **installable PWA** (manifest + service worker) — works on low-end Android devices without needing an app-store install.
- **Offline-first data entry** for attendance and CA score entry: queue writes locally (e.g. via IndexedDB through a library like Dexie.js) and sync them to the NestJS API via a background sync API once connectivity returns — important for classrooms with spotty Wi-Fi/data.
- A native app (React Native) is a Phase 3 option, reusing the same NestJS API and its typed client.

## 8. Security, Privacy & NDPR Compliance

- **Encryption**: TLS in transit everywhere; encryption at rest via the managed Postgres provider; sensitive fields (e.g., medical info) optionally column-level encrypted.
- **RBAC enforced server-side, in NestJS, on every endpoint** — never client-side only (§4).
- **Audit log**: append-only record of every sensitive action (score changes, fee adjustments, role changes, data exports, result publishing) — who, what, when, before/after values — written by the NestJS service layer, not the frontend.
- **NDPR/NDPA alignment**: since most data subjects are minors, the system should support parental consent capture at enrollment, data minimization (only collect fields actually used), a data export/deletion request workflow (data subject rights), and clear data retention policies (e.g., how long an alumnus's record is retained after graduation).
- **Webhook security**: payment gateway webhooks (received directly by NestJS, not Next.js) verified by signature before trusting any payment-confirmed event.
- **Rate limiting**: `@nestjs/throttler` on login, OTP, and payment endpoints to prevent brute-force/abuse.
- **Backups**: automated daily database backups with tested restore procedure; this is the school's official record system, data loss is not an acceptable risk.

## 9. Environments

- `dev` → `staging` → `production`, for **both** services, with seed data/scripts (run against the NestJS+Prisma side) that mimic the real school (sample classes, subjects, students) for fast iteration without touching real student data.

## 10. Integrations Summary

All third-party integrations live in the **NestJS backend** (never the frontend, since they all need a secret key):

- **Payments**: Paystack, Flutterwave, (optionally) Remita.
- **SMS**: Termii / Africa's Talking / KudiSMS / BulkSMSNigeria (start with one, design the messaging module behind a provider-agnostic interface so switching/adding a gateway later doesn't require a rewrite).
- **WhatsApp**: WhatsApp Business API (via a BSP like Termii, 360dialog, or Twilio).
- **Email**: Resend / SendGrid / Postmark.
- **AI features** (Phase 3): Claude API for comment suggestions, at-risk flagging, and chatbot — always with a human-in-the-loop review step for anything published to a parent/student (see [19-unique-differentiators.md](19-unique-differentiators.md)).

## 11. Repository Layout

A single Git repository with two top-level folders is the simplest setup that still keeps the two services cleanly separated:

```
/api    — the NestJS backend (own package.json, own deploy to Railway/Render/Fly.io)
/web    — the Next.js frontend (own package.json, own deploy to Vercel)
```

No shared build tooling (Turborepo/Nx) is needed at this size — that's a reasonable later upgrade if the codebase grows, not a Phase 1 requirement. See [21-build-guide.md](21-build-guide.md) §2 for the full list of accounts/API keys to create before writing any code.
