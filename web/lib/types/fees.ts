import type { components } from '@/types/api';

/**
 * Request DTOs from the generated OpenAPI types (source of truth: the
 * NestJS DTOs). Response shapes are hand-written against the actual
 * service return types in api/src/modules/{fees,payments,finance-reports}
 * — Swagger here only annotates request bodies, not responses, same
 * situation as every other lib/types/*.ts file in this app (see
 * lib/types/results.ts's identical note).
 */

export type CreateFeeStructureInput = components['schemas']['CreateFeeStructureDto'];
export type FeeComponentInput = components['schemas']['FeeComponentInputDto'];
export type AddFeeComponentInput = components['schemas']['AddFeeComponentDto'];
export type UpdateFeeComponentInput = components['schemas']['UpdateFeeComponentDto'];
export type GenerateInvoicesInput = components['schemas']['GenerateInvoicesDto'];
export type CreateIndividualInvoiceInput = components['schemas']['CreateIndividualInvoiceDto'];
export type InvoiceItemInput = components['schemas']['InvoiceItemInputDto'];
export type AddDiscountInput = components['schemas']['AddDiscountDto'];
export type CheckoutInput = components['schemas']['CheckoutDto'];
export type CreatePaymentPlanInput = components['schemas']['CreatePaymentPlanDto'];
export type InstallmentInput = components['schemas']['InstallmentInputDto'];

/** Narrower than the generated ManualPaymentDto.method (which includes PAYSTACK — that value is webhook/checkout-only, never a valid choice on this form). */
export type ManualPaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'POS';
export interface ManualPaymentInput {
  invoiceId: string;
  amount: number;
  method: ManualPaymentMethod;
  reference: string;
}

export type FeeComponentType = 'RECURRING' | 'ONE_OFF' | 'CONDITIONAL';
export type InvoiceStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';
export type DiscountType = 'PERCENTAGE' | 'FLAT';
export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'POS' | 'PAYSTACK';
export type TransactionStatus = 'PENDING' | 'SUCCESSFUL' | 'FAILED';
export type InstallmentStatus = 'PENDING' | 'PAID';

export interface FeeComponentDto {
  id: string;
  name: string;
  amount: number;
  type: FeeComponentType;
  feeStructureId: string;
  createdAt: string;
  updatedAt: string;
}

export interface FeeStructureDto {
  id: string;
  classId: string;
  termId: string;
  components: FeeComponentDto[];
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceLineItemDto {
  id: string;
  name: string;
  amount: number;
  feeComponentId: string | null;
  invoiceId: string;
  createdAt: string;
}

export interface DiscountDto {
  id: string;
  type: DiscountType;
  value: number;
  amount: number;
  reason: string;
  invoiceId: string;
  appliedByStaffId: string;
  createdAt: string;
}

export interface PaymentDto {
  id: string;
  amount: number;
  method: PaymentMethod;
  reference: string;
  invoiceId: string;
  transactionId: string | null;
  recordedByStaffId: string | null;
  receiptUrl: string | null;
  receiptGeneratedAt: string | null;
  paidAt: string;
  createdAt: string;
}

export interface PaymentTransactionDto {
  id: string;
  reference: string;
  amount: number;
  authorizationUrl: string | null;
  status: TransactionStatus;
  invoiceId: string;
  createdAt: string;
  updatedAt: string;
}

export interface InstallmentDto {
  id: string;
  dueDate: string;
  amount: number;
  status: InstallmentStatus;
  paidAt: string | null;
  paymentPlanId: string;
  createdAt: string;
}

export interface PaymentPlanDto {
  id: string;
  invoiceId: string;
  createdByStaffId: string;
  installments: InstallmentDto[];
  createdAt: string;
}

/** GET /invoices and /invoices/defaulters rows — includes the student's name (joined server-side), unlike the single-invoice detail response below. */
export interface InvoiceSummaryDto {
  id: string;
  studentId: string;
  studentName: string;
  admissionNumber: string;
  termId: string;
  description: string | null;
  subtotal: number;
  discountTotal: number;
  netPayable: number;
  amountPaid: number;
  balance: number;
  status: InvoiceStatus;
  dueDate: string | null;
  createdAt: string;
}

export interface DefaulterRowDto extends InvoiceSummaryDto {
  className: string;
  daysOverdue: number | null;
}

/** GET /invoices/:id — the raw invoice + relations + the same computed totals, but NOT the student's name (the caller already knows who they're looking at, e.g. via the page's own child-switcher or student search). */
export interface InvoiceDetailDto {
  id: string;
  studentId: string;
  termId: string;
  feeStructureId: string | null;
  description: string | null;
  subtotal: number;
  amountPaid: number;
  status: InvoiceStatus;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  lineItems: InvoiceLineItemDto[];
  discounts: DiscountDto[];
  payments: PaymentDto[];
  transactions: PaymentTransactionDto[];
  paymentPlan: PaymentPlanDto | null;
  discountTotal: number;
  netPayable: number;
  balance: number;
}

export interface GenerateInvoicesResponseDto {
  generated: number;
  skipped: number;
  totalAmount: number;
}

export interface CheckoutResponseDto {
  reference: string;
  authorizationUrl: string;
  accessCode: string;
}

export interface CollectionSummaryByClassDto {
  classId: string;
  className: string;
  expected: number;
  collected: number;
  outstanding: number;
}

export interface CollectionSummaryByComponentDto {
  name: string;
  expected: number;
  collected: number;
}

export interface CollectionSummaryByMethodDto {
  method: PaymentMethod;
  amount: number;
}

export interface CollectionSummaryDto {
  termId: string;
  totalExpected: number;
  totalCollected: number;
  totalOutstanding: number;
  byClass: CollectionSummaryByClassDto[];
  byComponent: CollectionSummaryByComponentDto[];
  byMethod: CollectionSummaryByMethodDto[];
}

export interface OutstandingByClassDto {
  classId: string;
  className: string;
  outstanding: number;
  invoiceCount: number;
}

export interface OutstandingByTermDto {
  termId: string;
  termName: string;
  sessionName: string;
  outstanding: number;
  invoiceCount: number;
}

export interface OutstandingReportDto {
  totalOutstanding: number;
  byClass: OutstandingByClassDto[];
  byTerm: OutstandingByTermDto[];
}

// --- Stage 14 additions ---

export type ExpenseCategory = 'SALARIES' | 'UTILITIES' | 'MAINTENANCE' | 'SUPPLIES' | 'OTHER';

export interface ExpenseDto {
  id: string;
  category: ExpenseCategory;
  amount: number;
  date: string;
  description: string;
  receiptUrl: string | null;
  recordedByStaffId: string;
  recordedBy: { firstName: string; lastName: string };
  voidedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExpensesListResponse {
  data: ExpenseDto[];
  totalAmount: number;
}

/** GET /payments — the receipts screen's rows. */
export interface PaymentRowDto {
  id: string;
  amount: number;
  method: PaymentMethod;
  reference: string;
  invoiceId: string;
  studentId: string;
  studentName: string;
  admissionNumber: string;
  invoiceDescription: string | null;
  recordedByName: string | null;
  receiptUrl: string | null;
  receiptGeneratedAt: string | null;
  paidAt: string;
}

export interface FinanceTrendPointDto {
  id: string;
  label: string;
  expected: number;
  collected: number;
  outstanding: number;
  collectionRate: number | null;
}

export interface FinanceTrendsDto {
  metric: 'collection' | 'outstanding';
  granularity: 'term' | 'session';
  points: FinanceTrendPointDto[];
}

export interface ExpensesSummaryByCategoryDto {
  category: ExpenseCategory;
  amount: number;
  count: number;
}

export interface ExpensesSummaryDto {
  totalExpenses: number;
  byCategory: ExpensesSummaryByCategoryDto[];
  totalCollected: number;
  netIncome: number;
  from: string | null;
  to: string | null;
}
