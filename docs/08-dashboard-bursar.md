# Bursar / Accountant Dashboard

## Who uses this

The **Bursar** or **Accounts Officer** responsible for school finance — fee billing, payment collection, reconciliation, and financial reporting. In smaller schools, the Principal may also act as Bursar; permissions still apply per-role.

## Purpose

Replace manual ledgers and disconnected Excel sheets with a real-time view of who owes what, who has paid, and the school's actual cash position — and remove the manual reconciliation burden between cash, bank transfer, POS, and online payments.

## Key Capabilities

### 1. Fee Structure Setup
- Define fee components per class/term/session: tuition, PTA levy, development levy, exam fee, sports levy, uniform, books, transport, hostel, etc.
- Set different fee structures per class level (JSS vs SSS typically differ) and optionally per arm/subject combination (e.g., Science students paying a lab levy).
- Configure one-off fees (admission fee, ID card fee) vs recurring per-term fees.

### 2. Invoice Generation
- Auto-generate an invoice per student per term based on the fee structure and the student's specific class/levies.
- Apply scholarships/discounts (sibling discount, staff-child discount, bursary award) at the invoice level.
- Bulk-generate invoices for an entire class/session at term start.

### 3. Payment Collection
- Record manual payments (cash, bank transfer, POS) with reference number and receiving staff logged.
- Reconcile online payments automatically via payment-gateway webhook (Paystack/Flutterwave) — no manual entry needed for those.
- Support partial payments against an invoice (running balance).
- Generate and print/email a receipt for every payment, with the school's letterhead.

### 4. Defaulter Tracking
- View a real-time defaulters list per class/term, sortable by amount owed or days overdue.
- Trigger reminder broadcasts (SMS/email/WhatsApp) to defaulters directly from the list — see [Communication Module](16-module-communication.md).
- Flag students for fee-related access restriction per school policy (e.g., withhold report card download until balance cleared — configurable, since some schools choose not to enforce this).

### 5. Installments & Payment Plans
- Offer a configurable installment schedule per student/family where the school allows it, with automatic reminders ahead of each installment date.

### 6. Expense Tracking
- Record non-fee school expenditure (utilities, maintenance, supplies) for a fuller financial picture, separate from the student-fee ledger.

### 7. Financial Reporting
- Income statement / collection summary for a term or session.
- Outstanding-balance report (school-wide, by class, by individual).
- Term-on-term and session-on-session collection trend.
- Payment-method breakdown (cash vs transfer vs online vs POS).
- Export to Excel/PDF for proprietor/board reporting.

### 8. Payroll Cross-Link (if HR/Payroll module enabled)
- View payroll run summaries for context against overall school cash flow (full payroll management lives in [HR/Staff Dashboard](12-dashboard-hr-staff.md)).

## Screens

- Finance Overview (collection rate this term, outstanding total, today's payments)
- Fee Structure setup
- Invoices (generate, list, per-student detail)
- Record Payment
- Receipts
- Defaulters List
- Installment Plans
- Expenses
- Financial Reports

## Sample Workflows

**Term-start billing run**: Bursar confirms the fee structure for the new term (or copies/adjusts the previous term's) → bulk-generates invoices for all currently-enrolled students → invoices appear instantly in each parent's dashboard with a "Pay Now" button.

**Reconciling an online payment**: Parent pays via Paystack on their dashboard → webhook fires → payment is automatically recorded against the correct invoice and a receipt is generated → Bursar sees the payment appear in real time with zero manual entry.

**Chasing defaulters**: Two weeks before term-end, Bursar opens the Defaulters List, filters by "owing > 50%," and sends a templated SMS+WhatsApp reminder to all of them in one action.

## Notifications received
- New online payment received.
- Invoice generation completed for a bulk run.
- A defaulter crosses a configurable "days overdue" threshold.

## Data exports
- Collection summary (Excel/PDF)
- Outstanding/defaulters report (Excel/PDF)
- Individual student fee statement (PDF)
- Receipts (PDF, individually or in bulk)
