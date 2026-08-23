# Stage 14 — Frontend Prompt (Bursar dashboard completion)

> Copy everything below the line into Claude Code as one message. Assumes this stage's backend prompt is done. Three of the four screens here call endpoints that **already existed before this stage** — `docs/22-implementation-status.md` §5 confirms the backend for Invoices, Receipts, Installments, and Discounts was real all along; only the frontend pages were never built.

---

Follow `prompts/00-DESIGN-SYSTEM.md` throughout.

## 1. Invoices (`/bursar/invoices`)
- A `DataTable` of invoices (student, term, total, balance, status badge) with a detail view per invoice showing line items, payment history, and applied discounts. Calls the existing `invoices.controller.ts` endpoints (list/detail) — no new backend needed.

## 2. Receipts (`/bursar/receipts`)
- A list of generated receipts (student, payment date, amount, method, download link) — calls the existing payment/receipt endpoints. Same async-PDF polling pattern as Stage 9's `documents-table.tsx` for any receipt still mid-render.

## 3. Installment Plans (`/bursar/installments`)
- A page to view/create installment plans against an invoice (due dates + amounts per installment), calling the existing `payment-plans.controller.ts`. Show per-installment status (paid/pending/overdue) clearly with badges.

## 4. Discount-application UI
- Add a "Apply Discount" action on the invoice detail page (percentage or flat amount, required reason field, calling the existing `POST /invoices/:id/discounts`) — currently this is only reachable by calling the API directly.

## 5. Expenses (`/bursar/expenses`)
- A simple ledger: `DataTable` of expenses (category, amount, date, description, recorded-by), a form to add a new one (with optional receipt upload), filterable by category/date range. Calls this stage's new backend.

## 6. Financial Reports — Phase 2 depth
- Add a trend chart (term-on-term and session-on-session collection rate) to `/bursar/reports`, and an expenses-summary card (total by category, net income) alongside the existing collection/outstanding cards.

**Done when**: every Bursar nav item in `dashboard-config.ts` resolves to a real page (none fall through to the "Coming Soon" catch-all), and a Bursar can go from "generate invoices for a class" through "record a payment" → "view the receipt" → "set up an installment plan for a struggling family" → "apply a sibling discount" → "log this term's generator fuel expense" entirely through the UI.
