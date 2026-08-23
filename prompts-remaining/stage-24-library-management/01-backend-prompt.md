# Stage 24 — Backend Prompt (Library Management)

> Copy everything below the line into Claude Code as one message. Assumes Stages 1–9 and 11 are complete. Closes `docs/22-implementation-status.md` §7 — the Librarian dashboard is currently pure nav scaffolding with zero backend. Build the Phase 2 core (`docs/10-dashboard-librarian.md` §1–5, §7); §6 Digital Resources is explicitly Phase 3 — skip it. **Don't confuse this with Stage 19's `Resources` module** — that one is teacher-uploaded class notes/slides for a specific subject; this dashboard's eventual Phase 3 Digital Resources is librarian-curated e-books/past-question banks, a different content domain even though both eventually surface on the Student dashboard's E-Library screen.

---

Read `docs/10-dashboard-librarian.md` in full before starting.

## 1. `LibraryModule` — Catalog
- `Book` model: title, author, ISBN/barcode, category, totalCopies, availableCopies (derived or maintained — pick one approach and be consistent: deriving from active loans on every read is simpler and less error-prone than maintaining a separate counter that can drift), shelfLocation.
- `POST /library/books`, `PATCH /library/books/:id`, `GET /library/books?search=&category=` — `@Roles('LIBRARIAN', 'ADMIN')` for writes, `@Roles()` (any authenticated role) for the search/browse read, since students/staff need to browse the catalog too.
- `POST /library/books/bulk-import` — same Excel preview/commit pattern as Stage 3's student import and Stage 13's staff import (by now a well-established convention — reuse it exactly, don't reinvent the wizard shape).

## 2. Circulation
- `Loan` model: bookId, borrowerType (`STUDENT` | `STAFF`), borrowerId, issuedAt, dueDate (computed from a configurable loan-period setting per borrower type), returnedAt (nullable), fineAmount (nullable).
- `POST /library/loans` — `@Roles('LIBRARIAN')`. Validates: the book has an available copy; the borrower hasn't hit their borrowing limit (students vs staff limits, school-configurable — reuse the same kind of per-school settings pattern as other configurable thresholds in this codebase rather than hardcoding 2/5).
- `POST /library/loans/:id/return` — calculates a fine if `now > dueDate`, per a configurable fine-per-day rate.
- `POST /library/loans/:id/renew` — rejects if the title has an active reservation (see below) from someone else; otherwise extends `dueDate` by one loan period.

## 3. Reservations
- `Reservation` model: bookId, borrowerType, borrowerId, reservedAt, status (`WAITING` | `AVAILABLE` | `FULFILLED` | `CANCELLED`). `POST /library/books/:id/reserve`. When a `Loan` is returned and a book becomes available, check for the oldest `WAITING` reservation on that title and flip it to `AVAILABLE` + notify the reserver (reuse `BroadcastsService`, new `RESERVATION_AVAILABLE` template) — this is the spec's "auto-notify when it's returned and available."

## 4. Overdue & Fines
- `GET /library/overdue` — `@Roles('LIBRARIAN', 'ADMIN')`, real-time list of loans past `dueDate`.
- A scheduled job (reuse `@nestjs/schedule`, same pattern as every other scheduled reminder in this codebase) sends an overdue reminder to the borrower on a configurable cadence (e.g. daily while overdue) — reuse `BroadcastsService`.
- Fine settlement: `POST /library/loans/:id/settle-fine` records the fine as paid directly (cash-in-hand at the library desk is the realistic common case), **and** optionally, per the spec's "optionally linked into Fees & Payments," allow creating an ad-hoc one-line `Invoice` for the fine amount via Stage 6's existing `InvoicesService` so it can be settled alongside school fees instead — implement both paths, don't force every fine through the full invoice flow when a librarian just wants to mark ₦50 as paid in person.

## 5. Analytics
- `GET /library/analytics?from=&to=` — most-borrowed titles, busiest periods (loans per week/month), overdue rate, category-level usage. Pure aggregation over `Loan`/`Book` — no new storage.

## 6. Data exports
- `GET /library/books/export`, `GET /library/overdue/export` — same `exceljs` pattern as earlier stages.

**Done when**: a book can be issued to a student, returned late with a correctly calculated fine, the fine settled either directly or via a real Invoice line item through the Bursar's existing payment flow, a reservation on a checked-out title correctly notifies the reserver once it's returned, and the analytics endpoint's "most borrowed" list matches a manual count against seeded loan data.
