'use client';

import { Loader2, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { MemberSearchBox } from '@/components/library/member-search-box';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { createReservation } from '@/lib/actions/library';
import type { BookDto, MemberSearchRow } from '@/lib/types/library';

export function NewReservationDialog({ books }: { books: BookDto[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [bookQuery, setBookQuery] = useState('');
  const [selectedBook, setSelectedBook] = useState<BookDto | null>(null);
  const [borrower, setBorrower] = useState<MemberSearchRow | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const bookMatches = useMemo(() => {
    if (bookQuery.trim().length < 2 || selectedBook) return [];
    const q = bookQuery.toLowerCase();
    return books.filter((b) => b.title.toLowerCase().includes(q)).slice(0, 8);
  }, [books, bookQuery, selectedBook]);

  function reset() {
    setBookQuery('');
    setSelectedBook(null);
    setBorrower(null);
  }

  async function handleCreate() {
    if (!selectedBook || !borrower) return toast.error('Choose a book and a member.');
    setIsSaving(true);
    try {
      await createReservation(selectedBook.id, {
        borrowerType: borrower.borrowerType,
        borrowerId: borrower.borrowerId,
      });
      toast.success('Reservation created.');
      reset();
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't create this reservation.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger render={<Button />}>
        <Plus className="size-4" aria-hidden="true" />
        New Reservation
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reserve a book</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative">
            <Input
              value={selectedBook ? selectedBook.title : bookQuery}
              onChange={(e) => {
                setBookQuery(e.target.value);
                setSelectedBook(null);
              }}
              placeholder="Search for a title…"
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
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted/50"
                    >
                      <span>{b.title}</span>
                      <Badge variant={b.availableCopies === 0 ? 'warning' : 'outline'} className="text-xs">
                        {b.availableCopies}/{b.totalCopies}
                      </Badge>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <MemberSearchBox onSelect={setBorrower} placeholder="Search member by name or ID…" />
          {borrower && (
            <p className="text-sm text-foreground">
              Member: <span className="font-medium">{borrower.name}</span>
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={() => void handleCreate()} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              'Reserve'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
