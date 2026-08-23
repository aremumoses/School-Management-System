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
    cell: ({ row }) => (
      <Link href={`/admin/lesson-notes/${row.original.id}`} className="block hover:underline">
        <span className="font-medium text-foreground">
          {row.original.submittedBy.firstName} {row.original.submittedBy.lastName}
        </span>
      </Link>
    ),
  },
  {
    id: 'classSubject',
    accessorFn: (row) => `${row.classSubject.class.name} ${row.classSubject.subject.name}`,
    header: 'Class / Subject',
    cell: ({ row }) => (
      <div>
        <p className="text-sm text-foreground">{row.original.classSubject.subject.name}</p>
        <p className="text-xs text-muted-foreground">
          {row.original.classSubject.class.name} · {row.original.term.name} term
        </p>
      </div>
    ),
  },
  {
    accessorKey: 'weekOfTerm',
    header: 'Week',
    cell: ({ row }) => <span className="tabular-nums">Week {row.original.weekOfTerm}</span>,
  },
  {
    accessorKey: 'topic',
    header: 'Topic',
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
      <Empty className="border border-dashed border-border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ClipboardCheck />
          </EmptyMedia>
          <EmptyTitle>Nothing to review</EmptyTitle>
          <EmptyDescription>No lesson notes match this filter.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <DataTable columns={columns} data={notes} searchPlaceholder="Search by teacher or topic…" />
  );
}
