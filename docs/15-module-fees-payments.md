# Module — Fees & Payments Engine

Used primarily by the [Bursar Dashboard](08-dashboard-bursar.md) (full control) and consumed by [Parent](07-dashboard-parent.md) (pay/view) and [Student](06-dashboard-student.md) (view-only), with read rollups into [School Admin](04-dashboard-school-admin.md).

## 1. Fee Structure Model

- A **Fee Structure** is defined per **class level + term + session**, composed of **Fee Components**: Tuition, PTA Levy, Development Levy, Examination Fee, Sports Levy, Uniform, Books, Transport, Hostel, ID Card, Admission Fee, etc.
- Components can be:
  - **Recurring** (charged every term, e.g., tuition).
  - **One-off** (charged once, e.g., admission fee, ID card fee — typically only in a student's first term).
  - **Conditional** (only applies if the student opts in, e.g., transport or hostel).
- Fee structures can differ by class level (JSS vs SSS commonly differ) and, optionally, by arm/subject-combination (e.g., a lab levy only for Science students).

## 2. Discounts & Scholarships

- Percentage or flat-amount discount, applicable per student per term: sibling discount, staff-child discount, bursary/scholarship award, early-payment discount.
- Discounts are recorded against the invoice with a reason, visible in financial reports (so the school can see total discount given, not just net revenue).

## 3. Invoicing

- Invoices are generated **per student per term**, computed as: Σ(applicable fee components) − Σ(discounts).
- Bulk-generation runs for an entire class/session at term start; individual invoices can be adjusted afterward (e.g., adding a one-off levy mid-term).
- Each invoice has a running balance as payments are applied; partial payments are fully supported.

## 4. Payment Collection

### Online payments
- **Paystack** and **Flutterwave** integration for card, bank transfer, and gateway-provided USSD payment options.
- **Remita** integration where a school specifically needs it (common for institutions with government-linked collection requirements).
- Payment confirmation via **webhook**, which automatically marks the invoice paid/partially paid and generates a receipt — no manual reconciliation needed for this channel.

### Manual payments
- Bursar records cash, bank-transfer, or POS payments directly, with reference number and the receiving staff member logged for accountability.
- Manual entries are reconciled against the bank statement at month-end using the system's payment log as the source of truth.

### Receipts
- Every payment (online or manual) generates a PDF receipt with the school's letterhead, automatically emailed/made available in the parent's dashboard, and printable at the bursary.

## 5. Installments & Payment Plans

- A school can offer a configurable installment schedule (e.g., 3 installments across the term) per family/student.
- Each installment has its own due date and triggers its own reminder sequence (see [Communication Module](16-module-communication.md) §5) as it approaches.

## 6. Defaulter Tracking

- Real-time list of students with an outstanding balance, sortable by amount owed, percentage paid, or days overdue.
- Configurable consequence policy (school's choice, not forced by the system): e.g., withhold report card download, restrict CBT exam access, or simply track without restriction — many Nigerian private schools want visibility without automatic punitive action.
- One-click bulk reminder to the entire defaulter list or a filtered subset.

## 7. Expenses (non-fee)

- Separate ledger for school expenditure (utilities, maintenance, salaries cross-link to [HR/Payroll](12-dashboard-hr-staff.md)) to give a fuller financial picture beyond just fee income.

## 8. Financial Reporting

- Collection summary (expected vs collected) per term/session, per class, per fee component.
- Outstanding/defaulters report.
- Payment-method breakdown (cash/transfer/online/POS).
- Term-on-term and session-on-session trend.

## 9. Currency & Localization

- **NGN only** — no multi-currency complexity needed for the initial Nigerian market.
- Amounts always displayed with the ₦ symbol and Nigerian thousands separators.

## 10. Security Considerations

- No raw card data is ever stored by the System — payment gateways handle card capture (PCI compliance lives with Paystack/Flutterwave, not with us).
- Webhook signatures are verified on every incoming payment-gateway callback before an invoice is marked paid, to prevent spoofed payment confirmations.
- All financial actions (manual payment entry, discount application, invoice edit) are written to the audit log (see [18-technical-architecture.md](18-technical-architecture.md) §8).
