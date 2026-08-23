'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { FileText } from 'lucide-react';
import Link from 'next/link';
import { DataTable } from '@/components/dashboard/data-table';
import { Badge } from '@/components/ui/badge';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { formatNaira } from '@/lib/format';
import type { InvoiceStatus, InvoiceSummaryDto } from '@/lib/types/fees';

export const INVOICE_STATUS_BADGE: Record<InvoiceStatus, 'success' | 'warning' | 'error'> = {
  PAID: 'success',
  PARTIALLY_PAID: 'warning',
  UNPAID: 'error',
};

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  PAID: 'Paid',
  PARTIALLY_PAID: 'Partially Paid',
  UNPAID: 'Unpaid',
};

const columns: ColumnDef<InvoiceSummaryDto, unknown>[] = [
  {
    accessorKey: 'studentName',
    header: 'Student',
    cell: ({ row }) => (
      <Link href={`/bursar/invoices/${row.original.id}`} className="block hover:underline">
        <p className="font-medium text-foreground">{row.original.studentName}</p>
        <p className="text-xs text-muted-foreground">{row.original.admissionNumber}</p>
      </Link>
    ),
  },
  {
    accessorKey: 'description',
    header: 'Description',
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {row.original.description ?? 'Term fees'}
      </span>
    ),
  },
  {
    accessorKey: 'netPayable',
    header: 'Total',
    cell: ({ row }) => (
      <span className="tabular-nums">{formatNaira(row.original.netPayable)}</span>
    ),
  },
  {
    accessorKey: 'balance',
    header: 'Balance',
    cell: ({ row }) => (
      <span className="tabular-nums font-medium text-foreground">
        {formatNaira(row.original.balance)}
      </span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <Badge variant={INVOICE_STATUS_BADGE[row.original.status]}>
        {INVOICE_STATUS_LABELS[row.original.status]}
      </Badge>
    ),
  },
  {
    id: 'dueDate',
    accessorFn: (row) => row.dueDate ?? '',
    header: 'Due Date',
    cell: ({ row }) =>
      row.original.dueDate ? (
        <span className="text-sm tabular-nums text-muted-foreground">
          {new Date(row.original.dueDate).toLocaleDateString('en-GB')}
        </span>
      ) : (
        <span className="text-xs text-muted-foreground">—</span>
      ),
  },
];

export function InvoicesTable({ rows }: { rows: InvoiceSummaryDto[] }) {
  if (rows.length === 0) {
    return (
      <Empty className="border border-dashed border-border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FileText />
          </EmptyMedia>
          <EmptyTitle>No invoices for this filter</EmptyTitle>
          <EmptyDescription>
            Generate invoices from the Fee Structure page, or pick a different term.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return <DataTable columns={columns} data={rows} searchPlaceholder="Search by student name…" />;
}
