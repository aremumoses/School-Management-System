import { PageHeader } from '@/components/dashboard/page-header';
import { listPayments } from '@/lib/actions/fees';
import { apiFetch } from '@/lib/api';
import type { TermDto } from '@/lib/types/academic';
import { ReceiptsTable } from './receipts-table';

export default async function ReceiptsPage() {
  const currentTerm = await apiFetch<TermDto>('/terms/current').catch(() => null);
  const payments = await listPayments({ termId: currentTerm?.id });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Receipts"
        description={`Every payment recorded this term${currentTerm ? ` (${currentTerm.name})` : ''}, with its PDF receipt. Receipts render in the background — rows still preparing refresh automatically.`}
      />
      <ReceiptsTable rows={payments} />
    </div>
  );
}
