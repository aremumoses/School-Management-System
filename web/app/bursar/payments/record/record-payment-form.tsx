'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Check, X } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getInvoice, recordManualPayment } from '@/lib/actions/fees';
import { formatNaira } from '@/lib/format';
import type { InvoiceSummaryDto, ManualPaymentMethod } from '@/lib/types/fees';
import type { StudentDto } from '@/lib/types/students';

const METHOD_OPTIONS: { value: ManualPaymentMethod; label: string }[] = [
  { value: 'CASH', label: 'Cash' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'POS', label: 'POS' },
];

const formSchema = z.object({
  amount: z.number({ message: 'Required' }).min(1, 'Must be greater than 0'),
  method: z.enum(['CASH', 'BANK_TRANSFER', 'POS']),
  reference: z.string().min(1, 'Required').max(200),
});

type FormValues = z.infer<typeof formSchema>;

export function RecordPaymentForm({
  student,
  invoices,
}: {
  student: StudentDto;
  invoices: InvoiceSummaryDto[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceSummaryDto | null>(
    invoices.length === 1 ? invoices[0] : null,
  );
  const [justPaid, setJustPaid] = useState<{ amount: number } | null>(null);

  function changeStudent() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('studentId');
    router.push(`${pathname}?${params.toString()}`);
  }

  if (invoices.length === 0) {
    return (
      <Card>
        <CardContent className="space-y-3">
          <StudentHeader student={student} onChange={changeStudent} />
          <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
            No outstanding invoices for this student — nothing to collect right now.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!selectedInvoice) {
    return (
      <Card>
        <CardContent className="space-y-3">
          <StudentHeader student={student} onChange={changeStudent} />
          <p className="text-sm text-muted-foreground">
            This student has {invoices.length} outstanding invoices — which one is this payment for?
          </p>
          <div className="space-y-2">
            {invoices.map((invoice) => (
              <button
                key={invoice.id}
                type="button"
                onClick={() => setSelectedInvoice(invoice)}
                className="flex w-full items-center justify-between rounded-lg border border-border p-3 text-left transition-colors hover:bg-accent/60"
              >
                <span className="text-sm text-foreground">{invoice.description ?? 'Term Invoice'}</span>
                <span className="tabular-nums font-medium text-foreground">{formatNaira(invoice.balance)}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="space-y-4">
        <StudentHeader student={student} onChange={changeStudent} />
        {justPaid ? (
          <PaymentSuccess
            amount={justPaid.amount}
            balance={selectedInvoice.balance}
            onRecordAnother={() => {
              setJustPaid(null);
              if (invoices.length > 1) setSelectedInvoice(null);
            }}
          />
        ) : (
          <PaymentFields
            invoice={selectedInvoice}
            onSuccess={(amount, updatedBalance) => {
              setSelectedInvoice({ ...selectedInvoice, balance: updatedBalance });
              setJustPaid({ amount });
            }}
          />
        )}
      </CardContent>
    </Card>
  );
}

function StudentHeader({ student, onChange }: { student: StudentDto; onChange: () => void }) {
  return (
    <div className="flex items-center justify-between border-b border-border pb-3">
      <div>
        <p className="text-lg font-semibold text-foreground">
          {student.firstName} {student.lastName}
        </p>
        <p className="font-mono text-xs text-muted-foreground">{student.admissionNumber}</p>
      </div>
      <Button variant="ghost" size="sm" onClick={onChange}>
        <X className="size-4" aria-hidden="true" />
        Change student
      </Button>
    </div>
  );
}

function PaymentFields({
  invoice,
  onSuccess,
}: {
  invoice: InvoiceSummaryDto;
  onSuccess: (amount: number, updatedBalance: number) => void;
}) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { amount: invoice.balance, method: 'CASH', reference: '' },
  });
  const method = watch('method');

  async function onSubmit(values: FormValues) {
    try {
      await recordManualPayment({
        invoiceId: invoice.id,
        amount: values.amount,
        method: values.method,
        reference: values.reference,
      });
      const updated = await getInvoice(invoice.id);
      onSuccess(values.amount, updated.balance);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't record payment.");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3">
        <span className="text-sm font-medium text-foreground">
          {invoice.description ?? 'Term Invoice'} — Balance
        </span>
        <span className="text-xl font-bold tabular-nums text-foreground">{formatNaira(invoice.balance)}</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="amount">Amount (₦)</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            min="0"
            className="tabular-nums"
            autoFocus
            {...register('amount', { valueAsNumber: true })}
          />
          {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Method</Label>
          <Select
            value={method}
            onValueChange={(v) => v && setValue('method', v as ManualPaymentMethod)}
            items={METHOD_OPTIONS}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {METHOD_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="reference">Reference Number</Label>
        <Input
          id="reference"
          placeholder="Bank ref / POS slip / receipt book no."
          {...register('reference')}
        />
        {errors.reference && <p className="text-sm text-destructive">{errors.reference.message}</p>}
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Recording…' : 'Record Payment'}
      </Button>
    </form>
  );
}

function PaymentSuccess({
  amount,
  balance,
  onRecordAnother,
}: {
  amount: number;
  balance: number;
  onRecordAnother: () => void;
}) {
  return (
    <div className="space-y-4 py-2 text-center">
      <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-success-soft animate-in zoom-in-50 duration-200">
        <Check className="size-7 text-success-soft-foreground" aria-hidden="true" />
      </div>
      <div>
        <p className="text-lg font-semibold text-foreground">
          {formatNaira(amount)} recorded
        </p>
        <p className="text-sm text-muted-foreground">
          {balance <= 0 ? (
            <Badge variant="success">Fully paid</Badge>
          ) : (
            <>New balance: <span className="tabular-nums font-medium text-foreground">{formatNaira(balance)}</span></>
          )}
        </p>
      </div>
      <Button onClick={onRecordAnother}>Record Another Payment</Button>
    </div>
  );
}
