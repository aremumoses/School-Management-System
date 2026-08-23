import { FileX2, Wallet } from 'lucide-react';
import { PageHeader } from '@/components/dashboard/page-header';
import { StatCard } from '@/components/dashboard/stat-card';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { apiFetch } from '@/lib/api';
import { formatNaira } from '@/lib/format';
import type { InvoiceStatus, InvoiceSummaryDto } from '@/lib/types/fees';

const STATUS_BADGE: Record<
  InvoiceStatus,
  { label: string; variant: 'success' | 'warning' | 'error' }
> = {
  PAID: { label: 'Paid', variant: 'success' },
  PARTIALLY_PAID: { label: 'Partially Paid', variant: 'warning' },
  UNPAID: { label: 'Unpaid', variant: 'error' },
};

export default async function StudentFeesPage() {
  // The API scopes /invoices to the logged-in student server-side.
  const invoices = await apiFetch<InvoiceSummaryDto[]>('/invoices');
  const totalBalance = invoices.reduce((sum, invoice) => sum + invoice.balance, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fee Status"
        description="Your invoices and what's outstanding. Payments are made by your parent or guardian through their own portal."
      />

      <StatCard
        label="Total Outstanding"
        value={formatNaira(totalBalance)}
        description={`Across ${invoices.length} invoice${invoices.length === 1 ? '' : 's'}`}
        icon={Wallet}
        variant={totalBalance > 0 ? 'warning' : 'success'}
      />

      {invoices.length === 0 ? (
        <Empty className="border border-dashed border-border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileX2 />
            </EmptyMedia>
            <EmptyTitle>No invoices yet</EmptyTitle>
            <EmptyDescription>
              Nothing has been billed to you yet — check back once the school issues this
              term&apos;s invoice.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="space-y-3">
          {invoices.map((invoice) => {
            const badge = STATUS_BADGE[invoice.status];
            return (
              <Card key={invoice.id}>
                <CardContent className="space-y-3 py-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">
                      {invoice.description ?? 'Term fees'}
                    </p>
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Total</p>
                      <p className="tabular-nums font-medium">{formatNaira(invoice.netPayable)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Paid</p>
                      <p className="tabular-nums font-medium">{formatNaira(invoice.amountPaid)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Balance</p>
                      <p className="tabular-nums font-semibold text-foreground">
                        {formatNaira(invoice.balance)}
                      </p>
                    </div>
                  </div>
                  {invoice.dueDate && (
                    <p className="text-xs text-muted-foreground">
                      Due{' '}
                      {new Date(invoice.dueDate).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
