'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Loader2, Paperclip, Trash2, Wallet } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { DataTable } from '@/components/dashboard/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { voidExpense } from '@/lib/actions/fees';
import { formatNaira } from '@/lib/format';
import type { ExpenseDto } from '@/lib/types/fees';
import { EXPENSE_CATEGORY_LABELS } from './expense-filters';

function VoidExpenseButton({ expense }: { expense: ExpenseDto }) {
  const [isVoiding, setIsVoiding] = useState(false);
  const [open, setOpen] = useState(false);

  async function handleVoid() {
    setIsVoiding(true);
    try {
      await voidExpense(expense.id);
      toast.success('Expense voided.');
      setOpen(false);
    } catch {
      toast.error("Couldn't void the expense.");
    } finally {
      setIsVoiding(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-destructive"
            aria-label={`Void ${expense.description}`}
          />
        }
      >
        <Trash2 className="size-3.5" aria-hidden="true" />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Void this expense?</AlertDialogTitle>
          <AlertDialogDescription>
            “{expense.description}” ({formatNaira(expense.amount)}) will be removed from the
            ledger and all totals, but the row stays on record in the audit trail. If it was a
            typo, void it and re-enter the correct figures.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" disabled={isVoiding} onClick={() => void handleVoid()}>
            {isVoiding ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Voiding…
              </>
            ) : (
              'Void Expense'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

const columns: ColumnDef<ExpenseDto, unknown>[] = [
  {
    accessorKey: 'date',
    header: 'Date',
    cell: ({ row }) => (
      <span className="tabular-nums text-sm">
        {new Date(row.original.date).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })}
      </span>
    ),
  },
  {
    accessorKey: 'category',
    header: 'Category',
    cell: ({ row }) => (
      <Badge variant="outline">
        {EXPENSE_CATEGORY_LABELS[row.original.category] ?? row.original.category}
      </Badge>
    ),
  },
  {
    accessorKey: 'description',
    header: 'Description',
    cell: ({ row }) => (
      <div className="flex items-center gap-1.5">
        <span className="text-foreground">{row.original.description}</span>
        {row.original.receiptUrl && (
          <a
            href={row.original.receiptUrl}
            target="_blank"
            rel="noreferrer"
            title="View attached receipt"
            className="text-muted-foreground hover:text-primary"
          >
            <Paperclip className="size-3.5" aria-hidden="true" />
            <span className="sr-only">View attached receipt</span>
          </a>
        )}
      </div>
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
    id: 'recordedBy',
    accessorFn: (row) => `${row.recordedBy.firstName} ${row.recordedBy.lastName}`,
    header: 'Recorded By',
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {row.original.recordedBy.firstName} {row.original.recordedBy.lastName}
      </span>
    ),
  },
  {
    id: 'actions',
    header: '',
    enableSorting: false,
    cell: ({ row }) => <VoidExpenseButton expense={row.original} />,
  },
];

export function ExpensesTable({ rows }: { rows: ExpenseDto[] }) {
  if (rows.length === 0) {
    return (
      <Empty className="border border-dashed border-border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Wallet />
          </EmptyMedia>
          <EmptyTitle>No expenses recorded</EmptyTitle>
          <EmptyDescription>
            Log the school&apos;s non-fee spending here — generator fuel, repairs, supplies — for a
            full financial picture.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return <DataTable columns={columns} data={rows} searchPlaceholder="Search descriptions…" />;
}
