# Stage 6 — Frontend Prompt (Fees & payment screens)

> Copy everything below the line into Claude Code as one message. Assumes Stage 6's backend endpoints already exist.

---

Read `docs/08-dashboard-bursar.md` and `docs/07-dashboard-parent.md` §3, and follow `prompts/00-DESIGN-SYSTEM.md` throughout. All currency is NGN — format every amount with the ₦ symbol and thousands separators (e.g. ₦125,000.00), and use `tabular-nums` per the design system's typography note so amounts align in tables.

## 1. Bursar: fee structure setup (`/bursar/fee-structures`)
- A builder UI: pick a class level + term, then add fee components as rows (name, amount, recurring/one-off/conditional toggle) with a running total shown live. "Generate Invoices for This Class" as the primary action, with a confirmation showing exactly how many students will be invoiced and the total amount before committing.

## 2. Bursar: defaulters list (`/bursar/defaulters`)
- A data table (per `00-DESIGN-SYSTEM.md` §6): student, class, amount owed, % paid (small inline progress bar), days overdue — sortable on all of these, filterable by class. Row checkboxes + a "Send Reminder" bulk action button (wires into Stage 7's broadcast once that exists; for now it can call a stub/queued endpoint). Overdue rows get a subtle `error`-tinted left border to draw the eye without being alarming.

## 3. Bursar: record payment (`/bursar/payments/record`)
- A simple, fast form: search/select student → invoice auto-loads with its current balance shown prominently → amount, method (cash/transfer/POS), reference number → "Record Payment." Show the updated balance immediately on success with a brief success animation (per `00-DESIGN-SYSTEM.md` §7) — this is a counter-facing screen that gets used dozens of times a day, it needs to be fast, not fancy.

## 4. Bursar: financial reports (`/bursar/reports`)
- Stat cards (collected vs. expected this term, collection rate %) plus a simple bar chart comparing classes, and a payment-method breakdown (donut or simple bar). Export buttons (Excel/PDF) per `docs/15-module-fees-payments.md` §8.

## 5. Parent: fees & payment (`/parent/fees`)
- Per-child invoice breakdown (each fee component as a line item, total, amount paid, balance due — laid out like a clean digital receipt, not a dense table), a prominent "Pay Now" button. Tapping it opens Paystack's checkout (use Paystack Inline JS with the **public** key only) for the outstanding balance, or a custom amount if an installment plan is active. On successful payment, show a clear success state and make the receipt immediately downloadable — this is a trust-critical moment, the confirmation needs to feel certain and complete, not ambiguous.
- Payment history below, each entry showing date, amount, method, and a receipt download link.

**Done when**: a Bursar can set up a fee structure and generate invoices for a class in under a minute, a parent can complete a real Paystack test-mode payment from their phone and immediately see an updated balance and a downloadable receipt, and the defaulters list accurately reflects unpaid/partially-paid invoices with correct sorting and filtering.
