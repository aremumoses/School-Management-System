import { Wallet } from 'lucide-react';
import { PageHeader } from '@/components/dashboard/page-header';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { apiFetch } from '@/lib/api';
import type { TermDto } from '@/lib/types/academic';
import type { InvoiceDetailDto, InvoiceSummaryDto, PaymentPlanDto } from '@/lib/types/fees';
import type { StudentListResponse } from '@/lib/types/students';
import { ChildFeesView } from './child-fees-view';
import { ChildSwitcher } from './child-switcher';

export interface InvoiceWithPlan extends InvoiceDetailDto {
  paymentPlan: PaymentPlanDto | null;
}

export default async function ParentFeesPage({
  searchParams,
}: {
  searchParams: Promise<{ studentId?: string }>;
}) {
  const params = await searchParams;
  const childrenRes = await apiFetch<StudentListResponse>('/students');
  const children = childrenRes.data;

  if (children.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Fees & Payments" />
        <Empty className="border border-dashed border-border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Wallet />
            </EmptyMedia>
            <EmptyTitle>No children linked to your account</EmptyTitle>
            <EmptyDescription>Contact the school office if this doesn&apos;t look right.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  const selectedId = children.some((c) => c.id === params.studentId) ? params.studentId! : children[0].id;
  const selectedChild = children.find((c) => c.id === selectedId)!;

  const [currentTerm, invoiceSummaries] = await Promise.all([
    apiFetch<TermDto>('/terms/current'),
    apiFetch<InvoiceSummaryDto[]>(`/invoices?studentId=${selectedId}`),
  ]);

  const invoices: InvoiceWithPlan[] = await Promise.all(
    invoiceSummaries
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((summary) => apiFetch<InvoiceWithPlan>(`/invoices/${summary.id}`)),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fees & Payments"
        description="Your child's invoices, balances, and payment history."
      />
      {children.length > 1 && (
        <ChildSwitcher
          options={children.map((c) => ({ id: c.id, label: `${c.firstName} ${c.lastName}` }))}
          selectedId={selectedId}
        />
      )}
      <ChildFeesView
        key={selectedId}
        studentName={`${selectedChild.firstName} ${selectedChild.lastName}`}
        invoices={invoices}
        currentTermId={currentTerm.id}
      />
    </div>
  );
}
