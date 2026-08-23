'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch } from '@/lib/api';
import type {
  AddDiscountInput,
  AddFeeComponentInput,
  CheckoutInput,
  CheckoutResponseDto,
  CreateFeeStructureInput,
  CreatePaymentPlanInput,
  ExpenseDto,
  ExpensesListResponse,
  ExpensesSummaryDto,
  FeeComponentDto,
  FeeStructureDto,
  FinanceTrendsDto,
  GenerateInvoicesInput,
  GenerateInvoicesResponseDto,
  InvoiceDetailDto,
  InvoiceSummaryDto,
  ManualPaymentInput,
  PaymentDto,
  PaymentPlanDto,
  PaymentRowDto,
  UpdateFeeComponentInput,
} from '@/lib/types/fees';

const FEE_STRUCTURES_PATH = '/bursar/fee-structures';
const DEFAULTERS_PATH = '/bursar/defaulters';
const REPORTS_PATH = '/bursar/reports';

export async function createFeeStructure(
  input: CreateFeeStructureInput,
): Promise<FeeStructureDto> {
  const structure = await apiFetch<FeeStructureDto>('/fee-structures', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  revalidatePath(FEE_STRUCTURES_PATH);
  return structure;
}

export async function addFeeComponent(
  structureId: string,
  input: AddFeeComponentInput,
): Promise<FeeComponentDto> {
  const component = await apiFetch<FeeComponentDto>(
    `/fee-structures/${structureId}/components`,
    { method: 'POST', body: JSON.stringify(input) },
  );
  revalidatePath(FEE_STRUCTURES_PATH);
  return component;
}

export async function updateFeeComponent(
  componentId: string,
  input: UpdateFeeComponentInput,
): Promise<FeeComponentDto> {
  const component = await apiFetch<FeeComponentDto>(
    `/fee-structures/components/${componentId}`,
    { method: 'PATCH', body: JSON.stringify(input) },
  );
  revalidatePath(FEE_STRUCTURES_PATH);
  return component;
}

export async function deleteFeeComponent(componentId: string): Promise<void> {
  await apiFetch<void>(`/fee-structures/components/${componentId}`, {
    method: 'DELETE',
  });
  revalidatePath(FEE_STRUCTURES_PATH);
}

/** Called twice from the builder — once with `dryRun: true` for the confirm-before-committing preview, then again without it to actually generate. */
export async function generateInvoices(
  input: GenerateInvoicesInput,
): Promise<GenerateInvoicesResponseDto> {
  const result = await apiFetch<GenerateInvoicesResponseDto>('/invoices/generate', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  if (!input.dryRun) {
    revalidatePath(FEE_STRUCTURES_PATH);
    revalidatePath(DEFAULTERS_PATH);
    revalidatePath(REPORTS_PATH);
  }
  return result;
}

export async function recordManualPayment(input: ManualPaymentInput): Promise<PaymentDto> {
  const payment = await apiFetch<PaymentDto>('/payments/manual', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  revalidatePath('/bursar/payments/record');
  revalidatePath(DEFAULTERS_PATH);
  revalidatePath(REPORTS_PATH);
  return payment;
}

export async function checkout(input: CheckoutInput): Promise<CheckoutResponseDto> {
  return apiFetch<CheckoutResponseDto>('/payments/checkout', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/**
 * A plain GET, exposed as a server action (not a page-level fetch) so
 * client components can re-pull the authoritative balance right after a
 * mutation — e.g. the record-payment counter screen showing the real
 * post-payment balance, and the parent fees page polling for a webhook
 * to land after a Paystack popup reports success.
 */
export async function getInvoice(id: string): Promise<InvoiceDetailDto> {
  return apiFetch<InvoiceDetailDto>(`/invoices/${id}`);
}

// --- Stage 14 additions ---

export async function listInvoices(opts: {
  termId?: string;
  classId?: string;
  status?: string;
  studentId?: string;
}): Promise<InvoiceSummaryDto[]> {
  const q = new URLSearchParams();
  if (opts.termId) q.set('termId', opts.termId);
  if (opts.classId) q.set('classId', opts.classId);
  if (opts.status) q.set('status', opts.status);
  if (opts.studentId) q.set('studentId', opts.studentId);
  const qs = q.toString();
  return apiFetch<InvoiceSummaryDto[]>(`/invoices${qs ? `?${qs}` : ''}`);
}

export async function applyDiscount(
  invoiceId: string,
  input: AddDiscountInput,
): Promise<InvoiceDetailDto> {
  const invoice = await apiFetch<InvoiceDetailDto>(`/invoices/${invoiceId}/discounts`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  revalidatePath(`/bursar/invoices/${invoiceId}`);
  revalidatePath('/bursar/invoices');
  return invoice;
}

export async function listPayments(opts: {
  termId?: string;
  method?: string;
}): Promise<PaymentRowDto[]> {
  const q = new URLSearchParams();
  if (opts.termId) q.set('termId', opts.termId);
  if (opts.method) q.set('method', opts.method);
  const qs = q.toString();
  return apiFetch<PaymentRowDto[]>(`/payments${qs ? `?${qs}` : ''}`);
}

export async function regenerateReceipt(paymentId: string): Promise<void> {
  await apiFetch(`/payments/${paymentId}/regenerate-receipt`, { method: 'POST' });
  revalidatePath('/bursar/receipts');
}

export async function getPaymentPlan(invoiceId: string): Promise<PaymentPlanDto | null> {
  return apiFetch<PaymentPlanDto | null>(`/invoices/${invoiceId}/payment-plan`);
}

export async function createPaymentPlan(
  invoiceId: string,
  input: CreatePaymentPlanInput,
): Promise<PaymentPlanDto> {
  const plan = await apiFetch<PaymentPlanDto>(`/invoices/${invoiceId}/payment-plan`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  revalidatePath('/bursar/installments');
  revalidatePath(`/bursar/invoices/${invoiceId}`);
  return plan;
}

export async function listExpenses(opts: {
  from?: string;
  to?: string;
  category?: string;
}): Promise<ExpensesListResponse> {
  const q = new URLSearchParams();
  if (opts.from) q.set('from', opts.from);
  if (opts.to) q.set('to', opts.to);
  if (opts.category) q.set('category', opts.category);
  const qs = q.toString();
  return apiFetch<ExpensesListResponse>(`/expenses${qs ? `?${qs}` : ''}`);
}

export async function createExpense(input: {
  category: string;
  amount: number;
  date: string;
  description: string;
}): Promise<ExpenseDto> {
  const expense = await apiFetch<ExpenseDto>('/expenses', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  revalidatePath('/bursar/expenses');
  return expense;
}

export async function uploadExpenseReceipt(
  expenseId: string,
  formData: FormData,
): Promise<ExpenseDto> {
  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    throw new Error('Choose a receipt file first.');
  }
  const body = new FormData();
  body.set('file', file);
  const expense = await apiFetch<ExpenseDto>(`/expenses/${expenseId}/receipt`, {
    method: 'POST',
    body,
  });
  revalidatePath('/bursar/expenses');
  return expense;
}

export async function voidExpense(expenseId: string): Promise<void> {
  await apiFetch(`/expenses/${expenseId}`, { method: 'DELETE' });
  revalidatePath('/bursar/expenses');
}

export async function getFinanceTrends(
  granularity: 'term' | 'session',
): Promise<FinanceTrendsDto> {
  return apiFetch<FinanceTrendsDto>(`/reports/finance/trends?granularity=${granularity}`);
}

export async function getExpensesSummary(opts: {
  from?: string;
  to?: string;
}): Promise<ExpensesSummaryDto> {
  const q = new URLSearchParams();
  if (opts.from) q.set('from', opts.from);
  if (opts.to) q.set('to', opts.to);
  const qs = q.toString();
  return apiFetch<ExpensesSummaryDto>(`/reports/finance/expenses-summary${qs ? `?${qs}` : ''}`);
}
