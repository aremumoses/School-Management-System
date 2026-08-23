import { Download, FileX2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { formatNaira } from '@/lib/format';
import type { InvoiceStatus } from '@/lib/types/fees';
import type { InvoiceWithPlan } from './page';
import { PayNowButton } from './pay-now-button';

const STATUS_BADGE: Record<InvoiceStatus, { label: string; variant: 'success' | 'warning' | 'error' }> = {
  PAID: { label: 'Paid', variant: 'success' },
  PARTIALLY_PAID: { label: 'Partially Paid', variant: 'warning' },
  UNPAID: { label: 'Unpaid', variant: 'error' },
};

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

const METHOD_LABELS: Record<string, string> = {
  CASH: 'Cash',
  BANK_TRANSFER: 'Bank Transfer',
  POS: 'POS',
  PAYSTACK: 'Online',
};

export function ChildFeesView({
  studentName,
  invoices,
  currentTermId,
}: {
  studentName: string;
  invoices: InvoiceWithPlan[];
  currentTermId: string;
}) {
  if (invoices.length === 0) {
    return (
      <Empty className="border border-dashed border-border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FileX2 />
          </EmptyMedia>
          <EmptyTitle>No invoices yet</EmptyTitle>
          <EmptyDescription>
            Nothing has been billed to {studentName} yet — check back once the school issues this term&apos;s invoice.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const allPayments = invoices
    .flatMap((invoice) => invoice.payments.map((payment) => ({ payment, invoice })))
    .sort((a, b) => new Date(b.payment.paidAt).getTime() - new Date(a.payment.paidAt).getTime());

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {invoices.map((invoice) => (
          <InvoiceCard key={invoice.id} invoice={invoice} isCurrentTerm={invoice.termId === currentTermId} />
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          {allPayments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
          ) : (
            <div className="divide-y divide-border">
              {allPayments.map(({ payment }) => (
                <div key={payment.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <div>
                    <p className="font-medium text-foreground">{formatDate(payment.paidAt)}</p>
                    <p className="text-xs text-muted-foreground">
                      {METHOD_LABELS[payment.method] ?? payment.method}
                    </p>
                  </div>
                  <span className="tabular-nums font-medium text-foreground">{formatNaira(payment.amount)}</span>
                  {payment.receiptUrl ? (
                    <a
                      href={payment.receiptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-primary hover:underline"
                    >
                      <Download className="size-3.5" aria-hidden="true" />
                      Receipt
                    </a>
                  ) : (
                    <span className="text-xs text-muted-foreground">Receipt generating…</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function InvoiceCard({ invoice, isCurrentTerm }: { invoice: InvoiceWithPlan; isCurrentTerm: boolean }) {
  const status = STATUS_BADGE[invoice.status];
  const nextInstallment = invoice.paymentPlan?.installments
    .filter((i) => i.status === 'PENDING')
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];

  return (
    <Card className={isCurrentTerm ? 'ring-1 ring-primary/30' : undefined}>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="text-lg">{invoice.description ?? 'Term Invoice'}</CardTitle>
        <Badge variant={status.variant}>{status.label}</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="divide-y divide-border rounded-lg border border-border">
          {invoice.lineItems.map((item) => (
            <div key={item.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span className="text-foreground">{item.name}</span>
              <span className="tabular-nums text-foreground">{formatNaira(item.amount)}</span>
            </div>
          ))}
          {invoice.discounts.map((discount) => (
            <div key={discount.id} className="flex items-center justify-between px-4 py-2.5 text-sm text-secondary">
              <span>Discount — {discount.reason}</span>
              <span className="tabular-nums">-{formatNaira(discount.amount)}</span>
            </div>
          ))}
        </div>

        <div className="space-y-1.5 rounded-lg bg-muted/30 px-4 py-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total</span>
            <span className="tabular-nums text-foreground">{formatNaira(invoice.netPayable)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Amount Paid</span>
            <span className="tabular-nums text-foreground">{formatNaira(invoice.amountPaid)}</span>
          </div>
          <div className="flex items-center justify-between border-t border-border pt-1.5 text-base font-semibold">
            <span className="text-foreground">Balance Due</span>
            <span className="tabular-nums text-foreground">{formatNaira(Math.max(0, invoice.balance))}</span>
          </div>
        </div>

        {invoice.balance > 0 && (
          <div className="space-y-2">
            {nextInstallment && (
              <p className="text-xs text-muted-foreground">
                Installment plan active — next: {formatNaira(nextInstallment.amount)} due{' '}
                {formatDate(nextInstallment.dueDate)}.
              </p>
            )}
            <PayNowButton
              invoiceId={invoice.id}
              fullBalance={invoice.balance}
              suggestedAmount={nextInstallment?.amount}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
