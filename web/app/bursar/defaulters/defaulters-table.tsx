'use client';

import type { ColumnDef, RowSelectionState } from '@tanstack/react-table';
import { useMemo, useState } from 'react';
import { ClipboardCheck } from 'lucide-react';
import { DataTable } from '@/components/dashboard/data-table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Progress, ProgressIndicator, ProgressTrack } from '@/components/ui/progress';
import { formatNaira } from '@/lib/format';
import type { DefaulterRowDto } from '@/lib/types/fees';
import { SendReminderButton } from './send-reminder-button';

function percentPaid(row: DefaulterRowDto): number {
  const netPayable = row.balance + row.amountPaid;
  if (netPayable <= 0) return 100;
  // Clamped defensively — the backend already excludes balance<=0 rows
  // from this list, so amountPaid can't legitimately exceed netPayable
  // here, but a progress bar should never visually overflow regardless
  // of how the data got here.
  return Math.min(100, Math.round((row.amountPaid / netPayable) * 100));
}

const columns: ColumnDef<DefaulterRowDto, unknown>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllRowsSelected()}
        indeterminate={table.getIsSomeRowsSelected() && !table.getIsAllRowsSelected()}
        onCheckedChange={(checked) => table.toggleAllRowsSelected(checked === true)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(checked) => row.toggleSelected(checked === true)}
        aria-label={`Select ${row.original.studentName}`}
      />
    ),
    enableSorting: false,
  },
  {
    accessorKey: 'studentName',
    header: 'Student',
    cell: ({ row }) => (
      <div>
        <p className="font-medium text-foreground">{row.original.studentName}</p>
        <p className="text-xs text-muted-foreground">{row.original.admissionNumber}</p>
      </div>
    ),
  },
  {
    accessorKey: 'className',
    header: 'Class',
  },
  {
    accessorKey: 'balance',
    header: 'Amount Owed',
    cell: ({ row }) => (
      <span className="tabular-nums font-medium text-foreground">{formatNaira(row.original.balance)}</span>
    ),
  },
  {
    id: 'percentPaid',
    accessorFn: percentPaid,
    header: '% Paid',
    cell: ({ row }) => {
      const pct = percentPaid(row.original);
      return (
        <div className="flex items-center gap-2">
          <Progress value={pct} className="w-20">
            <ProgressTrack>
              <ProgressIndicator />
            </ProgressTrack>
          </Progress>
          <span className="w-9 shrink-0 tabular-nums text-xs text-muted-foreground">{pct}%</span>
        </div>
      );
    },
  },
  {
    id: 'daysOverdue',
    accessorFn: (row) => row.daysOverdue ?? -1,
    header: 'Days Overdue',
    cell: ({ row }) => {
      const days = row.original.daysOverdue;
      if (days === null) return <span className="text-muted-foreground">No due date</span>;
      if (days <= 0) return <span className="text-muted-foreground">Not yet due</span>;
      return <Badge variant="error">{days} day{days === 1 ? '' : 's'} overdue</Badge>;
    },
  },
];

export function DefaultersTable({ rows }: { rows: DefaulterRowDto[] }) {
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const selectedIds = useMemo(
    () => Object.entries(rowSelection).filter(([, selected]) => selected).map(([id]) => id),
    [rowSelection],
  );
  const selectedRows = useMemo(
    () => rows.filter((row) => selectedIds.includes(row.id)),
    [rows, selectedIds],
  );

  if (rows.length === 0) {
    return (
      <Empty className="border border-dashed border-border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ClipboardCheck />
          </EmptyMedia>
          <EmptyTitle>No outstanding balances</EmptyTitle>
          <EmptyDescription>Every invoice in this view is either fully paid or doesn&apos;t exist yet.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="space-y-3">
      {selectedRows.length > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-2.5">
          <span className="text-sm font-medium text-foreground">
            {selectedRows.length} student{selectedRows.length === 1 ? '' : 's'} selected
          </span>
          <SendReminderButton rows={selectedRows} onSent={() => setRowSelection({})} />
        </div>
      )}
      <DataTable
        columns={columns}
        data={rows}
        searchPlaceholder="Search by student name…"
        getRowId={(row) => row.id}
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        rowClassName={(row) =>
          row.daysOverdue !== null && row.daysOverdue > 0 ? 'border-l-2 border-l-error' : undefined
        }
      />
    </div>
  );
}
