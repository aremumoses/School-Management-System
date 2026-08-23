# Stage 24 — Frontend Prompt (Library Management)

> Copy everything below the line into Claude Code as one message. Assumes this stage's backend prompt is done.

---

Follow `prompts/00-DESIGN-SYSTEM.md` throughout.

## 1. Catalog (`/librarian`, replacing the placeholder home)
- `DataTable` of books (title, author, category, copies available/total, shelf location), add/edit form (`Dialog`, same pattern as every other entity-form in this build), "Bulk Import" entry point mirroring `/admin/students/import`'s wizard exactly.

## 2. Circulation (`/librarian/circulation`)
- A fast issue/return screen: a search-as-you-type field for both the book and the borrower (no literal barcode-scanner hardware integration required — a phone camera or USB scanner that types into a focused text input works with a plain search box; don't build camera-access code unless you have a concrete library to do it with), issue button (shows the computed due date before confirming), and a return flow that surfaces any calculated fine immediately with a "Settle Now" / "Add to Fees Invoice" choice.

## 3. Members & Loans (`/librarian/members`)
- A member search (student or staff) showing their current loans, borrowing limit, and loan history.

## 4. Reservations (`/librarian/reservations`)
- A list of active reservations per book/member, with status (Waiting/Available/Fulfilled).

## 5. Overdue & Fines (`/librarian/overdue`)
- Real-time overdue list (borrower, book, days overdue, accrued fine), with a settle action per row. "Export to Excel" button.

## 6. Library Analytics (`/librarian/analytics`)
- Most-borrowed titles list, busiest-period chart, overdue-rate stat card, category-usage breakdown — reuse the chart patterns already established in Stage 13's Admin Analytics page.

**Done when**: every Librarian nav item resolves to a real page, a full issue→return→fine→settle cycle works end to end through the UI, and a reservation correctly shows as "Available" the moment the title is returned.
