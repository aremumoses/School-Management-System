'use client';

import { Loader2, Pencil, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
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
import { Label } from '@/components/ui/label';
import { createBook, updateBook } from '@/lib/actions/library';
import type { BookDto } from '@/lib/types/library';

export function BookFormDialog({ book }: { book?: BookDto }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(book?.title ?? '');
  const [author, setAuthor] = useState(book?.author ?? '');
  const [isbn, setIsbn] = useState(book?.isbn ?? '');
  const [category, setCategory] = useState(book?.category ?? '');
  const [totalCopies, setTotalCopies] = useState(String(book?.totalCopies ?? '1'));
  const [shelfLocation, setShelfLocation] = useState(book?.shelfLocation ?? '');
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    if (!title.trim() || !author.trim() || !category.trim()) {
      return toast.error('Title, author, and category are all required.');
    }
    setIsSaving(true);
    try {
      const input = {
        title: title.trim(),
        author: author.trim(),
        isbn: isbn.trim() || undefined,
        category: category.trim(),
        totalCopies: Number(totalCopies) || 1,
        shelfLocation: shelfLocation.trim() || undefined,
      };
      if (book) {
        await updateBook(book.id, input);
        toast.success('Book updated.');
      } else {
        await createBook(input);
        toast.success('Book added to the catalog.');
      }
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't save this book.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={book ? <Button variant="ghost" size="sm" /> : <Button />}>
        {book ? (
          <>
            <Pencil className="size-3.5" aria-hidden="true" />
            Edit
          </>
        ) : (
          <>
            <Plus className="size-4" aria-hidden="true" />
            Add Book
          </>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{book ? 'Edit book' : 'Add a book'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="bk-title">Title</Label>
            <Input id="bk-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bk-author">Author</Label>
            <Input id="bk-author" value={author} onChange={(e) => setAuthor(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="bk-category">Category</Label>
              <Input
                id="bk-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Fiction"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bk-isbn">ISBN (optional)</Label>
              <Input id="bk-isbn" value={isbn} onChange={(e) => setIsbn(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="bk-copies">Total copies</Label>
              <Input
                id="bk-copies"
                type="number"
                min="1"
                value={totalCopies}
                onChange={(e) => setTotalCopies(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bk-shelf">Shelf location</Label>
              <Input
                id="bk-shelf"
                value={shelfLocation}
                onChange={(e) => setShelfLocation(e.target.value)}
                placeholder="Fiction Shelf 4B"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={() => void handleSave()} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : book ? (
              'Save Changes'
            ) : (
              'Add Book'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
