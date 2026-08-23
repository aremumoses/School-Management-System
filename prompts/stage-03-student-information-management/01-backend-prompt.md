# Stage 3 — Backend Prompt (Student Information Management)

> Copy everything below the line into Claude Code as one message. Assumes Stages 1–2 are complete.

---

Read `docs/02-feature-list.md` §3 and `docs/19-unique-differentiators.md` §10 before starting.

Build a `StudentModule` in `/api`:

## 1. Core CRUD
- `POST /students`, `GET /students` (paginated, filterable by class/arm/session/status — see `docs/02-feature-list.md` §3's "Search & filter" item), `GET /students/:id`, `PATCH /students/:id`, `DELETE /students/:id` (soft-delete — never hard-delete a student record).
- Auto-generate the admission number on creation (configurable format, e.g. `{year}{sequence}` — make the format a School-level setting, not hardcoded).
- `POST /students/:id/photo` and `POST /students/:id/documents` — reuse the `StorageService` from Stage 2 for uploads (testimonials, certificates, medical forms — store as a list of `{type, url, uploadedAt}` rather than fixed fields, since the document types vary).

## 2. Guardians
- `POST /guardians`, link/unlink via `POST /students/:id/guardians` and `DELETE /students/:id/guardians/:guardianId`, with a `relationship` field (Mother/Father/Uncle/Guardian/etc.).
- When a guardian is created, also create their login account (email + a generated temporary password) — this is what Stage 7's "welcome SMS/email" will eventually send; for now just make sure the account exists and is usable via `/auth/login`.
- Support one guardian linked to multiple students (sibling households) and one student having multiple guardians.

## 3. Enrollment
- `POST /students/:id/enrollments` — enroll a student into a Class+Arm for a given Term, with a `status` (ACTIVE/PROMOTED/REPEATED/TRANSFERRED/WITHDRAWN/GRADUATED per the Stage 1 schema). A student should have exactly one ACTIVE enrollment at a time — enforce this.
- `GET /students/:id/enrollments` — full academic history across sessions, used for the transcript later.

## 4. Bulk import
- `POST /students/bulk-import` — accepts an uploaded Excel file (use `exceljs` or `xlsx`/SheetJS), parses rows into student + guardian records, and returns a **preview/validation result** (which rows are valid, which have errors and why) **before** committing anything. A second confirm call actually writes the validated rows. Don't silently skip bad rows — surface them so the Admin can fix the spreadsheet and re-upload.
- Be tolerant of real-world messy data: trim whitespace, accept a few common date formats, treat empty optional fields as null rather than rejecting the row.

Guard all writes with `@Roles('ADMIN')`; reads open more broadly per `docs/03-roles-and-permissions.md` §2 ("Student records" row — Class Teachers see their own class, Subject Teachers see their own students, etc. — implement that scoping in the service layer, not just the controller).

**Done when**: you can bulk-import a realistic 30-row test spreadsheet (include a couple of intentionally malformed rows) and get a clear validation report, then commit the valid rows and see them as real Student+Guardian+Enrollment records; a Class Teacher's token can list only their own class's students, not the whole school's.
