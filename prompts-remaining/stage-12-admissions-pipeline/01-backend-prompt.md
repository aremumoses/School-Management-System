# Stage 12 — Backend Prompt (Admissions Pipeline)

> Copy everything below the line into Claude Code as one message. Assumes Phase 1 (Stages 1–9) and Stage 11 are complete. Closes `docs/22-implementation-status.md`'s Admin §"Admissions (applicant pipeline)" row — currently only direct `POST /students` creation exists; there is no apply → review → convert workflow at all.

---

Read `docs/02-feature-list.md` §2 and `docs/04-dashboard-school-admin.md` §2 + its "New admission to enrollment" sample workflow before starting. Build the **Phase 1 (P1) scope only**: online application form, application-fee payment, offer-letter PDF, convert-to-student. Entrance exam scheduling/scoring, shortlisting/interview scheduling, and waitlist management are explicitly P2 per `docs/02-feature-list.md` §2 — don't build them yet, but design the `Applicant` model so a `status` enum can grow to accommodate them later without a breaking migration (e.g. don't hardcode an assumption that "approved" is the only step before "converted").

## 1. `AdmissionsModule`
- `Applicant` model: applicant bio-data (name, DOB, gender, address, intended class level, parent/guardian contact — name, phone, email), `status` (`SUBMITTED` → `UNDER_REVIEW` → `APPROVED` | `REJECTED` → `CONVERTED`), `submittedAt`, reviewer notes.
- `POST /admissions/apply` — **public, unauthenticated** endpoint (this is the one deliberately-open write endpoint in the whole API — guard it with `@nestjs/throttler` per Stage 11's pattern, since it has no auth to fall back on). Validates and creates an `Applicant` in `SUBMITTED` status.
- `GET /admissions` — `@Roles('ADMIN', 'VICE_PRINCIPAL')`, list/filter by status.
- `GET /admissions/:id` — same roles, full detail.
- `PATCH /admissions/:id/review` — same roles, transitions `SUBMITTED`/`UNDER_REVIEW` → `APPROVED` or `REJECTED` with required notes on rejection.
- `POST /admissions/:id/convert` — `@Roles('ADMIN')` only, only from `APPROVED` status. Accepts `{ classId, armId, admissionNumber? }` (reuse Stage 3's admission-number auto-generation if not supplied), creates the real `Student` + initial `Enrollment` + a `Guardian` (or links an existing one by email/phone — reuse Stage 3's `assert-email-available`/guardian-linking pattern, don't duplicate guardian records), sets the applicant to `CONVERTED`, and triggers a welcome SMS/email with parent-portal login credentials (reuse Stage 7's `BroadcastsService`/templates — add an `ADMISSION_WELCOME` system template, don't hand-roll a new send path).

## 2. Application fee payment
- Reuse Stage 6's Paystack integration, not a parallel payment path: `POST /admissions/:id/application-fee/checkout` creates a Paystack transaction for a configurable flat fee (store it on the `School` record or a simple `AdmissionsSettings` row — Admin-editable), and the existing `/webhooks/paystack` handler needs a new case that recognizes an admissions-fee payment (distinguish by transaction reference prefix or a metadata field) and marks the `Applicant`'s `applicationFeePaid` boolean, rather than crediting an `Invoice` (there is no invoice yet — the student doesn't exist).

## 3. Offer letter PDF
- Reuse the Stage 5/9 Puppeteer + `StorageService` + BullMQ pattern (same shape as `DocumentProcessor`): a new template rendering an offer letter (school header, applicant name, admitted class, resumption date, next-steps copy), generated on `APPROVED` status (not on submission), uploaded, URL stored on the `Applicant`.

**Done when**: a public, unauthenticated request can submit an application, pay the application fee via a real Paystack test transaction, an Admin can review/approve it, download a correctly-rendered offer letter PDF, and convert it into a real enrolled `Student` with a working guardian login — with zero duplicate guardian records if the same parent/email already exists in the system from a sibling's enrollment.
