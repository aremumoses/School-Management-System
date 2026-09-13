'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { ClipboardCheck } from 'lucide-react';
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
import {
  LESSON_NOTE_STATUS_BADGE,
  LESSON_NOTE_STATUS_LABELS,
} from '@/lib/lesson-note-status-labels';
import type { LessonNoteDto } from '@/lib/types/lesson-notes';

const columns: ColumnDef<LessonNoteDto, unknown>[] = [
  {
    id: 'teacher',
    accessorFn: (row) => `${row.submittedBy.firstName} ${row.submittedBy.lastName}`,
    header: 'Teacher',
    cell: ({ row }) => {
      const { firstName, lastName } = row.original.submittedBy;
      return (
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="hidden size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary md:flex dark:text-heading"
          >
            {`${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase()}
          </span>
          <Link
            href={`/admin/lesson-notes/${row.original.id}`}
            className="font-semibold text-heading hover:text-primary hover:underline dark:hover:text-foreground"
          >
            {firstName} {lastName}
          </Link>
        </div>
      );
    },
  },
  {
    id: 'classSubject',
    accessorFn: (row) => `${row.classSubject.class.name} ${row.classSubject.subject.name}`,
    header: 'Class / Subject',
    cell: ({ row }) => (
      <div>
        <p className="text-sm font-medium text-heading">{row.original.classSubject.subject.name}</p>
        <p className="text-xs text-muted-foreground">
          {row.original.classSubject.class.name} · {row.original.term.name} term
        </p>
      </div>
    ),
  },
  {
    accessorKey: 'weekOfTerm',
    header: 'Week',
    cell: ({ row }) => (
      <span className="font-medium text-primary tabular-nums dark:text-foreground">
        Week {row.original.weekOfTerm}
      </span>
    ),
  },
  {
    accessorKey: 'topic',
    header: 'Topic',
    cell: ({ row }) => (
      <span className="block max-w-xs whitespace-normal">{row.original.topic}</span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <Badge variant={LESSON_NOTE_STATUS_BADGE[row.original.status]}>
        {LESSON_NOTE_STATUS_LABELS[row.original.status]}
      </Badge>
    ),
  },
];

export function ApprovalQueueTable({ notes }: { notes: LessonNoteDto[] }) {
  if (notes.length === 0) {
    return (
      <Empty className="rounded-xl bg-card py-12 dark:ring-1 dark:ring-foreground/10">
        <EmptyHeader>
          <EmptyMedia
            variant="icon"
            className="size-12 rounded-full bg-primary/10 text-primary [&_svg:not([class*='size-'])]:size-5"
          >
            <ClipboardCheck />
          </EmptyMedia>
          <EmptyTitle className="text-base font-semibold text-heading">Nothing to review</EmptyTitle>
          <EmptyDescription>No lesson notes match this filter.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <DataTable columns={columns} data={notes} searchPlaceholder="Search by teacher or topic…" />
  );
}
