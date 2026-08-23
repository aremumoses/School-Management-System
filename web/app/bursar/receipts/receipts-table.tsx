'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Download, Loader2, ReceiptText, RefreshCcw } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { DataTable } from '@/components/dashboard/data-table';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { regenerateReceipt } from '@/lib/actions/fees';
import { formatNaira } from '@/lib/format';
import type { PaymentRowDto } from '@/lib/types/fees';

const METHOD_LABELS: Record<string, string> = {
  CASH: 'Cash',
  BANK_TRANSFER: 'Bank Transfer',
  POS: 'POS',
  PAYSTACK: 'Online',
};

function ReceiptCell({ payment }: { payment: PaymentRowDto }) {
  const [isRequeueing, setIsRequeueing] = useState(false);

  if (payment.receiptUrl) {
    return (
      <Button
        size="sm"
        variant="outline"
        render={<a href={payment.receiptUrl} target="_blank" rel="noreferrer" />}
      >
        <Download className="size-3.5" aria-hidden="true" />
        Download
      </Button>
    );
  }

  async function handleRegenerate() {
    setIsRequeueing(true);
    try {
      await regenerateReceipt(payment.id);
      toast.success('Receipt queued for regeneration.');
    } catch {
      toast.error("Couldn't re-queue the receipt.");
    } finally {
      setIsRequeueing(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="size-3 animate-spin" aria-hidden="true" />
        Preparing…
      </span>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => void handleRegenerate()}
        disabled={isRequeueing}
        title="Re-queue receipt generation"
      >
        <RefreshCcw className="size-3.5" aria-hidden="true" />
      </Button>
    </div>
  );
}

const columns: ColumnDef<PaymentRowDto, unknown>[] = [
  {
    accessorKey: 'studentName',
    header: 'Student',
    cell: ({ row }) => (
      <Link href={`/bursar/invoices/${row.original.invoiceId}`} className="block hover:underline">
        <p className="font-medium text-foreground">{row.original.studentName}</p>
        <p className="text-xs text-muted-foreground">{row.original.admissionNumber}</p>
      </Link>
    ),
  },
  {
    accessorKey: 'paidAt',
    header: 'Payment Date',
    cell: ({ row }) => (
      <span className="tabular-nums text-sm">
        {new Date(row.original.paidAt).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })}
      </span>
    ),
  },
  {
    accessorKey: 'amount',
    header: 'Amount',
    cell: ({ row }) => (
      <span className="tabular-nums font-medium text-foreground">
        {formatNaira(row.original.amount)}
      </span>
    ),
  },
  {
    accessorKey: 'method',
    header: 'Method',
    cell: ({ row }) => METHOD_LABELS[row.original.method] ?? row.original.method,
  },
  {
    accessorKey: 'reference',
    header: 'Reference',
    cell: ({ row }) => (
      <span className="font-mono text-xs text-muted-foreground">{row.original.reference}</span>
    ),
  },
  {
    id: 'receipt',
    header: 'Receipt',
    enableSorting: false,
    cell: ({ row }) => <ReceiptCell payment={row.original} />,
  },
];

export function ReceiptsTable({ rows }: { rows: PaymentRowDto[] }) {
  const router = useRouter();
  const isPreparing = rows.some((row) => !row.receiptUrl);

  // Same polling pattern as document-download-list.tsx — receipts render
  // asynchronously via BullMQ, so refresh until every row has a URL.
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (!isPreparing) return;
    let attempts = 0;
    pollRef.current = setInterval(() => {
      attempts += 1;
      router.refresh();
      if (attempts >= 20 && pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }, 3000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
    };
  }, [isPreparing, router]);

  if (rows.length === 0) {
    return (
      <Empty className="border border-dashed border-border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ReceiptText />
          </EmptyMedia>
          <EmptyTitle>No payments this term</EmptyTitle>
          <EmptyDescription>
            Receipts appear here automatically as payments are recorded.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return <DataTable columns={columns} data={rows} searchPlaceholder="Search by student name…" />;
}
