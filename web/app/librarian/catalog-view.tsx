'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Library, Upload } from 'lucide-react';
import Link from 'next/link';
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
import type { BookDto } from '@/lib/types/library';
import { BookFormDialog } from './book-form-dialog';

export function CatalogView({ books }: { books: BookDto[] }) {
  const columns: ColumnDef<BookDto, unknown>[] = [
    {
      id: 'title',
      header: 'Title',
      accessorFn: (row) => row.title,
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-foreground">{row.original.title}</p>
          <p className="text-xs text-muted-foreground">{row.original.author}</p>
        </div>
      ),
    },
    {
      id: 'category',
      header: 'Category',
      accessorFn: (row) => row.category,
      cell: ({ row }) => <Badge variant="outline">{row.original.category}</Badge>,
    },
    {
      id: 'copies',
      header: 'Copies',
      accessorFn: (row) => row.availableCopies,
      cell: ({ row }) => (
        <span
          className={
            row.original.availableCopies === 0
              ? 'font-medium text-error-soft-foreground'
              : 'text-foreground'
          }
        >
          {row.original.availableCopies} / {row.original.totalCopies} available
        </span>
      ),
    },
    {
      id: 'shelfLocation',
      header: 'Shelf',
      accessorFn: (row) => row.shelfLocation ?? '',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">{row.original.shelfLocation ?? '—'}</span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => <BookFormDialog book={row.original} />,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" render={<Link href="/librarian/catalog/import" />}>
          <Upload className="size-4" aria-hidden="true" />
          Bulk Import
        </Button>
        <BookFormDialog />
      </div>

      {books.length === 0 ? (
        <Empty className="border border-dashed border-border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Library />
            </EmptyMedia>
            <EmptyTitle>No books in the catalog yet</EmptyTitle>
            <EmptyDescription>
              Add a book above, or bulk-import an existing collection from a spreadsheet.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <DataTable columns={columns} data={books} searchPlaceholder="Search title/author…" />
      )}
    </div>
  );
}
