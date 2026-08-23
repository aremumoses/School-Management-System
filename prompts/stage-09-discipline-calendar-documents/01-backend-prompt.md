# Stage 9 — Backend Prompt (Discipline, Calendar & Documents)

> Copy everything below the line into Claude Code as one message. Assumes Stages 1–7 are complete (this reuses the PDF pipeline from Stage 5 and the broadcast service from Stage 7).

---

Read `docs/02-feature-list.md` §17, §19, and §20 before starting.

## 1. `DisciplineModule`
- `Incident` CRUD: student, reporting staff, description, severity, date. `POST /incidents/:id/action` records the outcome (Warning/Suspension/Expulsion) with a workflow — a Class Teacher can log an incident and propose an action, but Suspension/Expulsion requires `@Roles('ADMIN')` approval before it's final (per `docs/03-roles-and-permissions.md` §2 "Discipline" row).
- On any finalized action, trigger a notification to the student's guardian(s) via Stage 7's `CommunicationModule` (reuse it, don't rebuild messaging here).

## 2. `CalendarModule`
- `Event` CRUD (term dates, holidays, PTA meetings, sports day, etc.), each with optional RSVP enabled. `POST /events/:id/rsvp` for guardians/staff to respond; `GET /events/:id/rsvps` for the organizer to see responses.
- A simple `GET /calendar?from=&to=` combining events with term/session dates for a unified calendar view on the frontend.

## 3. `DocumentModule`
- Template-driven generation for testimonials and certificates (reuse the Puppeteer + `StorageService` pattern from Stage 5/6 — same pipeline, new templates): `POST /documents/generate` with `{ studentId, type: 'TESTIMONIAL'|'CERTIFICATE', templateId }`.
- An approval step: generated documents start as DRAFT, require `@Roles('ADMIN')` to mark APPROVED (recording an e-signature reference — store the Admin's name/timestamp, not an actual handwritten signature image unless you have one to embed) before they're downloadable by the student/parent.

**Done when**: a logged incident with a Suspension outcome correctly requires Admin approval before the guardian is notified, an event with RSVP enabled correctly tallies responses, and a generated testimonial is not downloadable by the parent until an Admin has explicitly approved it.
