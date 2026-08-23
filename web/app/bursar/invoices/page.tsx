import { PageHeader } from '@/components/dashboard/page-header';
import { listInvoices } from '@/lib/actions/fees';
import { apiFetch } from '@/lib/api';
import type { AcademicSessionDto } from '@/lib/types/academic';
import { InvoiceFilters } from './invoice-filters';
import { InvoicesTable } from './invoices-table';

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ termId?: string; status?: string }>;
}) {
  const params = await searchParams;

  const sessions = await apiFetch<AcademicSessionDto[]>('/academic-sessions');
  const terms = sessions
    .flatMap((session) =>
      session.terms.map((term) => ({
        id: term.id,
        label: `${session.name} — ${term.name}`,
        isCurrent: term.isCurrent,
      })),
    )
    .sort((a, b) => (a.isCurrent === b.isCurrent ? 0 : a.isCurrent ? -1 : 1));

  const termId = terms.some((t) => t.id === params.termId)
    ? params.termId
    : terms.find((t) => t.isCurrent)?.id;

  const invoices = await listInvoices({
    termId,
    status: params.status,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices"
        description="Every issued invoice for the selected term — click one to see line items, payments, and discounts."
      />
      <InvoiceFilters terms={terms} selectedTermId={termId} selectedStatus={params.status} />
      <InvoicesTable rows={invoices} />
    </div>
  );
}
