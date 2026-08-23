'use client';

import { BookCheck, BookX, Loader2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { MemberSearchBox } from '@/components/library/member-search-box';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { isLoanOverdue } from '@/lib/library-status';
import {
  getMemberDetail,
  issueLoan,
  returnLoan,
  settleFineDirect,
  settleFineWithInvoice,
} from '@/lib/actions/library';
import type { BookDto, LibraryLoanPolicy, LoanDto, MemberSearchRow } from '@/lib/types/library';

function dueDatePreview(borrowerType: 'STUDENT' | 'STAFF', policy: LibraryLoanPolicy): string {
  const days = borrowerType === 'STUDENT' ? policy.studentLoanDays : policy.staffLoanDays;
  const due = new Date(Date.now() + days * 86_400_000);
  return due.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function IssueSection({
  books,
  policy,
}: {
  books: BookDto[];
  policy: LibraryLoanPolicy;
}) {
  const [bookQuery, setBookQuery] = useState('');
  const [selectedBook, setSelectedBook] = useState<BookDto | null>(null);
  const [borrower, setBorrower] = useState<MemberSearchRow | null>(null);
  const [isIssuing, setIsIssuing] = useState(false);

  const bookMatches = useMemo(() => {
    if (bookQuery.trim().length < 2 || selectedBook) return [];
    const q = bookQuery.toLowerCase();
    return books
      .filter((b) => b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q))
      .slice(0, 8);
  }, [books, bookQuery, selectedBook]);

  async function handleIssue() {
    if (!selectedBook || !borrower) return;
    setIsIssuing(true);
    try {
      await issueLoan({
        bookId: selectedBook.id,
        borrowerType: borrower.borrowerType,
        borrowerId: borrower.borrowerId,
      });
      toast.success(`Issued "${selectedBook.title}" to ${borrower.name}.`);
      setSelectedBook(null);
      setBookQuery('');
      setBorrower(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't issue this book.");
    } finally {
      setIsIssuing(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Issue a Book</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Input
            value={selectedBook ? selectedBook.title : bookQuery}
            onChange={(e) => {
              setBookQuery(e.target.value);
              setSelectedBook(null);
            }}
            placeholder="Search by title or author…"
            aria-label="Search books"
          />
          {bookMatches.length > 0 && (
            <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-border bg-card shadow-md">
              {bookMatches.map((b) => (
                <li key={b.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBook(b);
                      setBookQuery(b.title);
                    }}
                    disabled={b.availableCopies === 0}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span>
                      {b.title} <span className="text-xs text-muted-foreground">— {b.author}</span>
                    </span>
                    <Badge variant={b.availableCopies > 0 ? 'success' : 'error'} className="text-xs">
                      {b.availableCopies}/{b.totalCopies}
                    </Badge>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <MemberSearchBox
          onSelect={setBorrower}
          placeholder="Search borrower by name or admission no./email…"
        />
        {borrower && (
          <p className="text-sm text-foreground">
            Borrower: <span className="font-medium">{borrower.name}</span>{' '}
            <span className="text-xs text-muted-foreground">
              ({borrower.borrowerType === 'STUDENT' ? 'Student' : 'Staff'} · {borrower.identifier})
            </span>
          </p>
        )}

        {selectedBook && borrower && (
          <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
            <p className="text-foreground">
              Due back: <span className="font-medium">{dueDatePreview(borrower.borrowerType, policy)}</span>
            </p>
          </div>
        )}

        <Button
          onClick={() => void handleIssue()}
          disabled={!selectedBook || !borrower || isIssuing}
        >
          {isIssuing ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <BookCheck className="size-4" aria-hidden="true" />
          )}
          Issue Book
        </Button>
      </CardContent>
    </Card>
  );
}

function FineSettlement({
  loan,
  currentTermId,
  onSettled,
}: {
  loan: LoanDto;
  currentTermId: string | null;
  onSettled: () => void;
}) {
  const [isSettling, setIsSettling] = useState<'direct' | 'invoice' | null>(null);

  async function handleDirect() {
    setIsSettling('direct');
    try {
      await settleFineDirect(loan.id);
      toast.success('Fine settled — paid at the desk.');
      onSettled();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't settle this fine.");
    } finally {
      setIsSettling(null);
    }
  }

  async function handleInvoice() {
    if (!currentTermId) return toast.error('No current term is set.');
    setIsSettling('invoice');
    try {
      await settleFineWithInvoice(loan.id, { termId: currentTermId });
      toast.success('Fine added to a Fees invoice.');
      onSettled();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't add this fine to an invoice.");
    } finally {
      setIsSettling(null);
    }
  }

  return (
    <div className="space-y-2 rounded-lg border border-error-soft bg-error-soft/30 p-3">
      <p className="text-sm text-error-soft-foreground">
        Fine accrued: <span className="font-medium">₦{loan.fineAmount}</span>
      </p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => void handleDirect()} disabled={isSettling !== null}>
          {isSettling === 'direct' ? (
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
            disabled={isSettling !== null}
          >
            {isSettling === 'invoice' ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
            ) : (
              'Add to Fees Invoice'
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

function ReturnSection({ currentTermId }: { currentTermId: string | null }) {
  const [borrower, setBorrower] = useState<MemberSearchRow | null>(null);
  const [activeLoans, setActiveLoans] = useState<LoanDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [returningId, setReturningId] = useState<string | null>(null);
  const [justReturned, setJustReturned] = useState<LoanDto | null>(null);

  async function selectBorrower(m: MemberSearchRow) {
    setBorrower(m);
    setJustReturned(null);
    setIsLoading(true);
    try {
      const detail = await getMemberDetail(m.borrowerType, m.borrowerId);
      setActiveLoans(detail.activeLoans);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleReturn(loanId: string) {
    setReturningId(loanId);
    try {
      const returned = await returnLoan(loanId);
      toast.success('Book returned.');
      setActiveLoans((prev) => prev.filter((l) => l.id !== loanId));
      if (returned.fineAmount !== null) {
        setJustReturned(returned);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't return this book.");
    } finally {
      setReturningId(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Return a Book</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <MemberSearchBox onSelect={(m) => void selectBorrower(m)} />

        {borrower && (
          <p className="text-sm text-foreground">
            Borrower: <span className="font-medium">{borrower.name}</span>
          </p>
        )}

        {justReturned && (
          <FineSettlement
            loan={justReturned}
            currentTermId={currentTermId}
            onSettled={() => setJustReturned(null)}
          />
        )}

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : borrower && activeLoans.length === 0 ? (
          <p className="text-sm text-muted-foreground">No books currently out.</p>
        ) : (
          <ul className="space-y-2">
            {activeLoans.map((loan) => {
              const isOverdue = isLoanOverdue(loan.dueDate);
              return (
                <li
                  key={loan.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{loan.bookTitle}</p>
                    <p className="text-xs text-muted-foreground">
                      Due {new Date(loan.dueDate).toLocaleDateString()}
                      {isOverdue && (
                        <span className="ml-1.5 text-error-soft-foreground">— overdue</span>
                      )}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void handleReturn(loan.id)}
                    disabled={returningId === loan.id}
                  >
                    {returningId === loan.id ? (
                      <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                      <BookX className="size-3.5" aria-hidden="true" />
                    )}
                    Return
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function CirculationView({
  books,
  policy,
  currentTermId,
}: {
  books: BookDto[];
  policy: LibraryLoanPolicy;
  currentTermId: string | null;
}) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <IssueSection books={books} policy={policy} />
      <ReturnSection currentTermId={currentTermId} />
    </div>
  );
}
