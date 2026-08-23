'use client';

import { AlertTriangle, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { returnLoan, settleFineDirect, settleFineWithInvoice } from '@/lib/actions/library';
import type { LoanDto, OverdueRow } from '@/lib/types/library';

function FineSettlement({
  loan,
  currentTermId,
  onSettled,
}: {
  loan: LoanDto;
  currentTermId: string | null;
  onSettled: () => void;
}) {
  const [isBusy, setIsBusy] = useState<'direct' | 'invoice' | null>(null);

  async function handleDirect() {
    setIsBusy('direct');
    try {
      await settleFineDirect(loan.id);
      toast.success('Fine settled.');
      onSettled();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't settle this fine.");
    } finally {
      setIsBusy(null);
    }
  }

  async function handleInvoice() {
    if (!currentTermId) return toast.error('No current term is set.');
    setIsBusy('invoice');
    try {
      await settleFineWithInvoice(loan.id, { termId: currentTermId });
      toast.success('Fine added to a Fees invoice.');
      onSettled();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't add this fine to an invoice.");
    } finally {
      setIsBusy(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant="warning">₦{loan.fineAmount} fine</Badge>
      <Button size="sm" onClick={() => void handleDirect()} disabled={isBusy !== null}>
        {isBusy === 'direct' ? (
          <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
        ) : (
          'Settle Now'
        )}
      </Button>
      {loan.borrowerType === 'STUDENT' && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => void handleInvoice()}
          disabled={isBusy !== null}
        >
          {isBusy === 'invoice' ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
          ) : (
            'Add to Fees Invoice'
          )}
        </Button>
      )}
    </div>
  );
}

function OverdueRowCard({ row, currentTermId }: { row: OverdueRow; currentTermId: string | null }) {
  const [returnedLoan, setReturnedLoan] = useState<LoanDto | null>(null);
  const [isReturning, setIsReturning] = useState(false);
  const [isSettled, setIsSettled] = useState(false);

  async function handleReturn() {
    setIsReturning(true);
    try {
      const loan = await returnLoan(row.loanId);
      setReturnedLoan(loan);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't return this book.");
    } finally {
      setIsReturning(false);
    }
  }

  if (isSettled) return null;

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3">
        <div>
          <p className="font-medium text-foreground">{row.bookTitle}</p>
          <p className="text-xs text-muted-foreground">
            {row.borrowerName} ({row.borrowerType === 'STUDENT' ? 'Student' : 'Staff'}) · Due{' '}
            {new Date(row.dueDate).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {returnedLoan ? (
            <FineSettlement
              loan={returnedLoan}
              currentTermId={currentTermId}
              onSettled={() => setIsSettled(true)}
            />
          ) : (
            <>
              <Badge variant="error">
                {row.daysOverdue} day{row.daysOverdue === 1 ? '' : 's'} overdue
              </Badge>
              <Badge variant="warning">₦{row.accruedFine} accruing</Badge>
              <Button size="sm" onClick={() => void handleReturn()} disabled={isReturning}>
                {isReturning ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  'Mark Returned'
                )}
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function OverdueView({
  rows,
  currentTermId,
}: {
  rows: OverdueRow[];
  currentTermId: string | null;
}) {
  if (rows.length === 0) {
    return (
      <Empty className="border border-dashed border-border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <AlertTriangle />
          </EmptyMedia>
          <EmptyTitle>Nothing overdue</EmptyTitle>
          <EmptyDescription>Every loan is within its due date.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <OverdueRowCard key={row.loanId} row={row} currentTermId={currentTermId} />
      ))}
    </div>
  );
}
