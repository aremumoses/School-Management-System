import { ArrowLeft, Download } from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/components/dashboard/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getInvoice, listInvoices } from '@/lib/actions/fees';
import { formatNaira } from '@/lib/format';
import { INVOICE_STATUS_BADGE, INVOICE_STATUS_LABELS } from '../invoices-table';
import { ApplyDiscountDialog } from './apply-discount-dialog';

const METHOD_LABELS: Record<string, string> = {
  CASH: 'Cash',
  BANK_TRANSFER: 'Bank Transfer',
  POS: 'POS',
  PAYSTACK: 'Online (Paystack)',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const invoice = await getInvoice(id);
  // The detail endpoint doesn't join the student's name (see the DTO's
  // comment) — the summary list for the same student does, so borrow it.
  const siblingRows = await listInvoices({ studentId: invoice.studentId });
  const summary = siblingRows.find((row) => row.id === id);
  const studentLabel = summary
    ? `${summary.studentName} (${summary.admissionNumber})`
    : 'Invoice';

  return (
    <div className="space-y-6">
      <PageHeader
        title={studentLabel}
        description={invoice.description ?? 'Term fees invoice'}
        action={
          <div className="flex items-center gap-2">
            <Badge variant={INVOICE_STATUS_BADGE[invoice.status]}>
              {INVOICE_STATUS_LABELS[invoice.status]}
            </Badge>
            <Button variant="ghost" size="sm" render={<Link href="/bursar/invoices" />}>
              <ArrowLeft className="size-4" aria-hidden="true" />
              All Invoices
            </Button>
          </div>
        }
      />

      {/* Totals strip */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        {[
          { label: 'Subtotal', value: invoice.subtotal },
          { label: 'Discounts', value: -invoice.discountTotal },
          { label: 'Net Payable', value: invoice.netPayable },
          { label: 'Paid', value: invoice.amountPaid },
          { label: 'Balance', value: invoice.balance },
        ].map(({ label, value }) => (
          <Card key={label}>
            <CardContent className="py-3">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-lg font-bold tabular-nums text-foreground">
                {formatNaira(value)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Line items */}
        <Card>
          <CardHeader>
            <CardTitle>Line Items</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-border">
                {invoice.lineItems.map((item) => (
                  <tr key={item.id}>
                    <td className="py-2 text-foreground">{item.name}</td>
                    <td className="py-2 text-right tabular-nums">{formatNaira(item.amount)}</td>
                  </tr>
                ))}
                <tr className="font-medium">
                  <td className="py-2">Subtotal</td>
                  <td className="py-2 text-right tabular-nums">{formatNaira(invoice.subtotal)}</td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Discounts */}
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Discounts</CardTitle>
            <ApplyDiscountDialog invoiceId={invoice.id} subtotal={invoice.subtotal} />
          </CardHeader>
          <CardContent>
            {invoice.discounts.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No discounts applied.
              </p>
            ) : (
              <ul className="divide-y divide-border text-sm">
                {invoice.discounts.map((discount) => (
                  <li key={discount.id} className="flex items-start justify-between gap-3 py-2">
                    <div className="min-w-0">
                      <p className="text-foreground">{discount.reason}</p>
                      <p className="text-xs text-muted-foreground">
                        {discount.type === 'PERCENTAGE'
                          ? `${discount.value}% of subtotal`
                          : 'Flat amount'}{' '}
                        · {formatDate(discount.createdAt)}
                      </p>
                    </div>
                    <span className="shrink-0 tabular-nums font-medium text-foreground">
                      −{formatNaira(discount.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Payments */}
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          {invoice.payments.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No payments recorded yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="pb-2 font-medium">Date</th>
                    <th className="pb-2 font-medium">Method</th>
                    <th className="pb-2 font-medium">Reference</th>
                    <th className="pb-2 text-right font-medium">Amount</th>
                    <th className="pb-2 text-right font-medium">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {invoice.payments.map((payment) => (
                    <tr key={payment.id}>
                      <td className="py-2 tabular-nums">{formatDate(payment.paidAt)}</td>
                      <td className="py-2">{METHOD_LABELS[payment.method] ?? payment.method}</td>
                      <td className="py-2 font-mono text-xs text-muted-foreground">
                        {payment.reference}
                      </td>
                      <td className="py-2 text-right tabular-nums font-medium">
                        {formatNaira(payment.amount)}
                      </td>
                      <td className="py-2 text-right">
                        {payment.receiptUrl ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            render={
                              <a href={payment.receiptUrl} target="_blank" rel="noreferrer" />
                            }
                          >
                            <Download className="size-3.5" aria-hidden="true" />
                            PDF
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">Preparing…</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Installment plan */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Installment Plan</CardTitle>
          <Button
            variant="outline"
            size="sm"
            render={<Link href={`/bursar/installments?invoiceId=${invoice.id}`} />}
          >
            {invoice.paymentPlan ? 'View Plan' : 'Set Up Plan'}
          </Button>
        </CardHeader>
        <CardContent>
          {invoice.paymentPlan ? (
            <p className="text-sm text-muted-foreground">
              {invoice.paymentPlan.installments.length} installment
              {invoice.paymentPlan.installments.length === 1 ? '' : 's'} —{' '}
              {invoice.paymentPlan.installments.filter((i) => i.status === 'PAID').length} paid.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              No installment plan — the full balance is due at once.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
