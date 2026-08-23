import { CalendarClock } from 'lucide-react';
import { PageHeader } from '@/components/dashboard/page-header';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { getInvoice, getPaymentPlan, listInvoices } from '@/lib/actions/fees';
import type { InvoiceDetailDto, PaymentPlanDto } from '@/lib/types/fees';
import { InstallmentPlanView } from './installment-plan-view';
import { InvoicePicker } from './invoice-picker';
import { NewPlanForm } from './new-plan-form';

export default async function InstallmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ invoiceId?: string }>;
}) {
  const params = await searchParams;

  // Unpaid/partially-paid invoices are the ones a plan makes sense for.
  const invoices = await listInvoices({});
  const openInvoices = invoices.filter((invoice) => invoice.status !== 'PAID');

  const selectedId = openInvoices.some((invoice) => invoice.id === params.invoiceId)
    ? params.invoiceId!
    : // Allow deep-links to any invoice (e.g. a PAID one, to review its plan)
      invoices.find((invoice) => invoice.id === params.invoiceId)?.id;

  let detail: InvoiceDetailDto | null = null;
  let plan: PaymentPlanDto | null = null;
  if (selectedId) {
    [detail, plan] = await Promise.all([
      getInvoice(selectedId),
      getPaymentPlan(selectedId),
    ]);
  }

  const selectedSummary = invoices.find((invoice) => invoice.id === selectedId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Installment Plans"
        description="Split an invoice into dated installments for a family paying in parts. Installments must add up to the invoice's outstanding balance."
      />

      <InvoicePicker invoices={openInvoices} selectedId={selectedId} />

      {!selectedId ? (
        <Empty className="border border-dashed border-border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CalendarClock />
            </EmptyMedia>
            <EmptyTitle>Pick an invoice</EmptyTitle>
            <EmptyDescription>
              Choose an unpaid or partially-paid invoice above to view or set up its installment
              plan.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : plan ? (
        <InstallmentPlanView
          plan={plan}
          studentLabel={
            selectedSummary
              ? `${selectedSummary.studentName} (${selectedSummary.admissionNumber})`
              : 'Invoice'
          }
        />
      ) : detail ? (
        <NewPlanForm
          invoiceId={selectedId}
          balance={detail.balance}
          studentLabel={
            selectedSummary
              ? `${selectedSummary.studentName} (${selectedSummary.admissionNumber})`
              : 'Invoice'
          }
        />
      ) : null}
    </div>
  );
}
