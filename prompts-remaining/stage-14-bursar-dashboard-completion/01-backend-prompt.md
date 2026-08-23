# Stage 14 — Backend Prompt (Bursar dashboard completion)

> Copy everything below the line into Claude Code as one message. Assumes Stages 1–9 and 11 are complete. Closes `docs/22-implementation-status.md` §5's remaining gaps. Most of Bursar's screens are frontend-only gaps (Invoices, Receipts, Installments, Discounts UI) — this prompt is therefore small; only the Expenses ledger is genuinely new backend.

---

Read `docs/15-module-fees-payments.md` §6 (Expenses) and §9–10 (Reporting) before starting.

## 1. Expenses module (net new)
- `Expense` model: category (free text or a small fixed enum — salaries/utilities/maintenance/supplies/other), amount, date, description, recordedByStaffId, optional receipt/attachment URL (reuse `StorageService`).
- `ExpensesController`: `POST /expenses` (`@Roles('BURSAR', 'ADMIN')`), `GET /expenses?from=&to=&category=`, `GET /expenses/:id`, `PATCH /expenses/:id`, `DELETE /expenses/:id` (soft — Bursar/Admin only, audit-logged like every other financial mutation in this codebase, not a hard delete given Stage 6/9's established "audit-significant records aren't hard-deleted" convention — confirm whether `Expense` actually needs that protection or whether a true delete is fine for a misentered row; lean toward soft-delete/void rather than hard delete to stay consistent).

## 2. Financial reports — Phase 2 depth
- Extend `finance-reports.controller.ts`: `GET /reports/finance/trends?metric=collection|outstanding&granularity=term|session` — term-on-term and session-on-session comparison (reuse the existing per-class/per-component aggregation logic, just group by term/session instead of computing one snapshot). `GET /reports/finance/expenses-summary?from=&to=` — total expenses by category, net income (collection − expenses) for a period.

**Done when**: a non-fee expense (e.g. "Generator fuel — ₦45,000") can be recorded, listed, and filtered by category/date range, and the trends endpoint returns a real term-over-term collection-rate comparison that matches a manual cross-check against two terms' worth of seed payment data.
