'use client';

import { Loader2, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createPaymentPlan } from '@/lib/actions/fees';
import { formatNaira } from '@/lib/format';

interface InstallmentRow {
  dueDate: string;
  amount: string;
}

export function NewPlanForm({
  invoiceId,
  balance,
  studentLabel,
}: {
  invoiceId: string;
  balance: number;
  studentLabel: string;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<InstallmentRow[]>([
    { dueDate: '', amount: '' },
    { dueDate: '', amount: '' },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const enteredTotal = rows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
  const difference = balance - enteredTotal;
  const sumsMatch = Math.abs(difference) <= 0.01;

  function updateRow(index: number, field: keyof InstallmentRow, value: string) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  }

  async function handleSubmit() {
    const parsed = rows.map((row) => ({
      dueDate: row.dueDate,
      amount: Number(row.amount),
    }));
    if (parsed.some((row) => !row.dueDate || !row.amount || row.amount <= 0)) {
      toast.error('Every installment needs a due date and a positive amount.');
      return;
    }
    if (!sumsMatch) {
      toast.error(
        `Installments must add up to the outstanding balance of ${formatNaira(balance)}.`,
      );
      return;
    }
    setIsSubmitting(true);
    try {
      await createPaymentPlan(invoiceId, { installments: parsed });
      toast.success('Installment plan created.');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't create the plan.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>New Plan — {studentLabel}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Outstanding balance:{' '}
          <strong className="text-foreground">{formatNaira(balance)}</strong> — the installments
          below must add up to exactly this amount.
        </p>

        <div className="space-y-3">
          {rows.map((row, index) => (
            <div key={index} className="flex flex-wrap items-end gap-3">
              <div className="space-y-1.5">
                <Label htmlFor={`due-${index}`}>Installment {index + 1} due</Label>
                <Input
                  id={`due-${index}`}
                  type="date"
                  value={row.dueDate}
                  onChange={(e) => updateRow(index, 'dueDate', e.target.value)}
                  className="w-44"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`amount-${index}`}>Amount (₦)</Label>
                <Input
                  id={`amount-${index}`}
                  type="number"
                  min="0"
                  value={row.amount}
                  onChange={(e) => updateRow(index, 'amount', e.target.value)}
                  placeholder="e.g. 50000"
                  className="w-40"
                />
              </div>
              {rows.length > 2 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setRows((prev) => prev.filter((_, i) => i !== index))}
                  aria-label={`Remove installment ${index + 1}`}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </Button>
              )}
            </div>
          ))}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setRows((prev) => [...prev, { dueDate: '', amount: '' }])}
        >
          <Plus className="size-3.5" aria-hidden="true" />
          Add Installment
        </Button>

        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            sumsMatch
              ? 'border-success-soft bg-success-soft text-success-soft-foreground'
              : 'border-warning-soft bg-warning-soft text-warning-soft-foreground'
          }`}
        >
          Entered total: <strong>{formatNaira(enteredTotal)}</strong>
          {sumsMatch
            ? ' — matches the outstanding balance.'
            : ` — ${difference > 0 ? formatNaira(difference) + ' short of' : formatNaira(-difference) + ' over'} the balance.`}
        </div>

        <div className="flex justify-end border-t border-border pt-4">
          <Button onClick={() => void handleSubmit()} disabled={isSubmitting || !sumsMatch}>
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Creating…
              </>
            ) : (
              'Create Plan'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
