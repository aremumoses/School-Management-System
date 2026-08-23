'use client';

import { UserSearch } from 'lucide-react';
import { useState } from 'react';
import { MemberSearchBox } from '@/components/library/member-search-box';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { getMemberDetail } from '@/lib/actions/library';
import { isLoanOverdue } from '@/lib/library-status';
import type { LoanDto, MemberDetailDto, MemberSearchRow } from '@/lib/types/library';

function LoanRow({ loan }: { loan: LoanDto }) {
  const isOverdue = !loan.returnedAt && isLoanOverdue(loan.dueDate);
  return (
    <li className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
      <div>
        <p className="text-sm font-medium text-foreground">{loan.bookTitle}</p>
        <p className="text-xs text-muted-foreground">
          Issued {new Date(loan.issuedAt).toLocaleDateString()} · Due{' '}
          {new Date(loan.dueDate).toLocaleDateString()}
          {loan.returnedAt && ` · Returned ${new Date(loan.returnedAt).toLocaleDateString()}`}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {isOverdue && <Badge variant="error">Overdue</Badge>}
        {loan.fineAmount !== null && (
          <Badge variant={loan.fineSettledAt || loan.fineInvoiceId ? 'outline' : 'warning'}>
            ₦{loan.fineAmount} fine{loan.fineSettledAt || loan.fineInvoiceId ? ' (settled)' : ''}
          </Badge>
        )}
      </div>
    </li>
  );
}

export function MembersView() {
  const [detail, setDetail] = useState<MemberDetailDto | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSelect(member: MemberSearchRow) {
    setIsLoading(true);
    try {
      const d = await getMemberDetail(member.borrowerType, member.borrowerId);
      setDetail(d);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <MemberSearchBox onSelect={(m) => void handleSelect(m)} />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !detail ? (
        <Empty className="border border-dashed border-border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <UserSearch />
            </EmptyMedia>
            <EmptyTitle>Search for a member</EmptyTitle>
            <EmptyDescription>
              Every student and staff member is automatically a library member — search by name,
              admission number, or email.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {detail.name}{' '}
                <span className="text-sm font-normal text-muted-foreground">
                  ({detail.borrowerType === 'STUDENT' ? 'Student' : 'Staff'} · {detail.identifier})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {detail.activeLoans.length} of {detail.borrowLimit} books currently out
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Current Loans ({detail.activeLoans.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {detail.activeLoans.length === 0 ? (
                <p className="text-sm text-muted-foreground">No books currently out.</p>
              ) : (
                <ul className="space-y-2">
                  {detail.activeLoans.map((loan) => (
                    <LoanRow key={loan.id} loan={loan} />
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Loan History ({detail.history.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {detail.history.length === 0 ? (
                <p className="text-sm text-muted-foreground">No past loans.</p>
              ) : (
                <ul className="space-y-2">
                  {detail.history.map((loan) => (
                    <LoanRow key={loan.id} loan={loan} />
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
