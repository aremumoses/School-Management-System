# Stage 6 — Backend Prompt (Fees & Payments)

> Copy everything below the line into Claude Code as one message. Assumes Stages 1–5 are complete (the report-card PDF pipeline from Stage 5 is reused here for receipts).

---

Read **`docs/15-module-fees-payments.md` in full** before starting.

## 1. `FeeModule`
- `FeeStructure` + `FeeComponent` CRUD (§1): components flagged recurring/one-off/conditional, scoped per class level + term + session. Validate the school can have multiple structures active for different class levels in the same term.
- Discount/scholarship endpoint: `POST /invoices/:id/discounts` — percentage or flat amount, with a required `reason`, recorded distinctly (never just silently lowering the total) so reports can show gross vs. discounted (§2).
- `POST /invoices/generate` — bulk-generates invoices for a class/session from the active fee structure; `POST /invoices/:studentId` for an individual one-off invoice (e.g. mid-term levy). Invoices track a running balance as payments apply (§3).

## 2. `PaymentModule`
- `POST /payments/checkout` — given an `invoiceId`, creates a Paystack transaction server-side (secret key never leaves the backend) and returns the checkout reference/URL for the frontend to open.
- `POST /webhooks/paystack` — **verify the `x-paystack-signature` header against the raw request body using the Paystack secret key before doing anything else**; reject with 400 if it doesn't match. On a verified successful-charge event, mark the invoice paid/partially paid, create a `Payment` record, and enqueue a receipt-PDF job (reuse the Puppeteer pipeline from Stage 5 — same pattern, a receipt template instead of a report card).
- `POST /payments/manual` — `@Roles('BURSAR')`, records a cash/transfer/POS payment with a reference number and the recording staff's id, same downstream effects (balance update, receipt job) as a webhook-confirmed payment.
- `GET /invoices/defaulters?classId=&minOwed=&minDaysOverdue=` — filterable defaulters list (§6).
- Installment plan support (§5): a `PaymentPlan` model splitting an invoice into dated installments, each independently trackable for the reminder logic Stage 7 will use.

## 3. Receipts
- A `ReceiptProcessor` (BullMQ) rendering a receipt PDF (school letterhead, payment details, running balance) on every confirmed payment, uploaded via `StorageService`, linked on the `Payment` record.

## 4. Reporting
- `GET /reports/finance/collection-summary?termId=` — expected vs. collected, by class and by fee component.
- `GET /reports/finance/outstanding` — the full outstanding-balance report.

Guard all of this per `docs/03-roles-and-permissions.md` §2 ("Fees & invoicing" row) — Bursar full control, Parent/Student view-own + pay, Admin view-only.

**Done when**: you can generate invoices for a whole seeded class, pay one via a real Paystack **test-mode** transaction end-to-end (checkout → webhook → invoice marked paid → receipt PDF generated), record a manual payment for another student, and confirm a deliberately-tampered webhook payload (wrong/missing signature) is rejected with no database changes. Write a test specifically for the signature-verification rejection.
