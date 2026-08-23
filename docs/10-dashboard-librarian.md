# Librarian Dashboard

## Who uses this

The school **Librarian** managing the physical (and optionally digital) book collection.

## Purpose

Digitize the card-catalog-and-notebook approach most school libraries still use, so the school always knows what it owns, who has what, and what's overdue.

## Key Capabilities

### 1. Catalog Management
- Add/edit books with title, author, ISBN/barcode, category, number of copies, shelf location.
- Bulk-import catalog via Excel for libraries digitizing an existing collection.
- Barcode/QR scanning support for fast check-in/check-out (via phone camera or a barcode scanner peripheral).

### 2. Circulation (Issue / Return)
- Issue a book to a student or staff member with an automatic due date based on configurable loan period.
- Process returns, automatically calculating any overdue fine per the school's fine policy.
- Renew a loan if no one else has reserved the title.

### 3. Member Management
- Every student and staff member is automatically a library member (no separate registration); librarian can set borrowing limits per member type (e.g., students can hold 2 books at once, staff 5).

### 4. Reservations
- Allow a member to reserve a currently-checked-out title; auto-notify when it's returned and available.

### 5. Overdue Management
- Real-time overdue list with automatic reminder notifications (SMS/push) to the borrower.
- Fine tracking, optionally linked into the [Fees & Payments Module](15-module-fees-payments.md) so fines can be settled alongside school fees.

### 6. Digital Resources (Phase 3)
- Host e-books/PDFs and digital past-question banks, browsable by students directly (ties into the e-library view on the [Student Dashboard](06-dashboard-student.md)).

### 7. Analytics
- Most-borrowed titles, busiest periods, overdue rate, category-level usage — useful for justifying new acquisitions to the Admin.

## Screens

- Catalog (list, add/edit book)
- Circulation (issue/return scanner view)
- Members & current loans
- Reservations
- Overdue & Fines
- Digital Resources (Phase 3)
- Library Analytics

## Sample Workflow

**Daily circulation**: Student brings a book to the desk → librarian scans the book's barcode and the student's ID card/QR → system records the issue with a due date → on return, librarian scans again, and any fine is calculated automatically if late.

## Notifications received
- Book overdue (for librarian's own follow-up dashboard).
- Reserved title becomes available.

## Data exports
- Catalog inventory (Excel)
- Overdue/fines report (Excel/PDF)
