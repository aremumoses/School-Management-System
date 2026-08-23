import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatNaira } from '@/lib/format';
import type { InstallmentDto, PaymentPlanDto } from '@/lib/types/fees';

type DisplayStatus = 'paid' | 'overdue' | 'pending';

function displayStatus(installment: InstallmentDto): DisplayStatus {
  if (installment.status === 'PAID') return 'paid';
  return new Date(installment.dueDate).getTime() < Date.now() ? 'overdue' : 'pending';
}

const STATUS_BADGE: Record<DisplayStatus, { variant: 'success' | 'error' | 'warning'; label: string }> = {
  paid: { variant: 'success', label: 'Paid' },
  overdue: { variant: 'error', label: 'Overdue' },
  pending: { variant: 'warning', label: 'Pending' },
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function InstallmentPlanView({
  plan,
  studentLabel,
}: {
  plan: PaymentPlanDto;
  studentLabel: string;
}) {
  const total = plan.installments.reduce((sum, i) => sum + i.amount, 0);
  const paidCount = plan.installments.filter((i) => i.status === 'PAID').length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {studentLabel} — {plan.installments.length} installments, {paidCount} paid
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                <th className="pb-2 font-medium">#</th>
                <th className="pb-2 font-medium">Due Date</th>
                <th className="pb-2 text-right font-medium">Amount</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium">Paid On</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {plan.installments.map((installment, index) => {
                const status = displayStatus(installment);
                const badge = STATUS_BADGE[status];
                return (
                  <tr key={installment.id}>
                    <td className="py-2.5 text-muted-foreground">{index + 1}</td>
                    <td className="py-2.5 tabular-nums">{formatDate(installment.dueDate)}</td>
                    <td className="py-2.5 text-right tabular-nums font-medium">
                      {formatNaira(installment.amount)}
                    </td>
                    <td className="py-2.5">
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </td>
                    <td className="py-2.5 text-muted-foreground">
                      {installment.paidAt ? formatDate(installment.paidAt) : '—'}
                    </td>
                  </tr>
                );
              })}
              <tr className="font-medium">
                <td className="py-2.5" colSpan={2}>
                  Total
                </td>
                <td className="py-2.5 text-right tabular-nums">{formatNaira(total)}</td>
                <td colSpan={2} />
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
