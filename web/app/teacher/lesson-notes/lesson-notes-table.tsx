'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Copy, Loader2, NotebookPen } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
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
import { duplicateLessonNote } from '@/lib/actions/lesson-notes';
import {
  LESSON_NOTE_STATUS_BADGE,
  LESSON_NOTE_STATUS_LABELS,
} from '@/lib/lesson-note-status-labels';
import type { LessonNoteDto } from '@/lib/types/lesson-notes';

function DuplicateButton({ note }: { note: LessonNoteDto }) {
  const router = useRouter();
  const [isDuplicating, setIsDuplicating] = useState(false);

  async function handleDuplicate() {
    setIsDuplicating(true);
    try {
      const draft = await duplicateLessonNote(note.id);
      toast.success('Draft created — edit away.');
      // Open the fresh PENDING draft in the editor immediately.
      router.push(`/teacher/lesson-notes/${draft.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't duplicate this note.");
      setIsDuplicating(false);
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => void handleDuplicate()}
      disabled={isDuplicating}
      title="Duplicate into a new draft for the current term"
    >
      {isDuplicating ? (
        <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
      ) : (
        <Copy className="size-3.5" aria-hidden="true" />
      )}
      Duplicate
    </Button>
  );
}

const columns: ColumnDef<LessonNoteDto, unknown>[] = [
  {
    id: 'classSubject',
    accessorFn: (row) => `${row.classSubject.class.name} ${row.classSubject.subject.name}`,
    header: 'Class / Subject',
    cell: ({ row }) => (
      <Link href={`/teacher/lesson-notes/${row.original.id}`} className="block hover:underline">
        <p className="font-medium text-foreground">{row.original.classSubject.subject.name}</p>
        <p className="text-xs text-muted-foreground">
          {row.original.classSubject.class.name} · {row.original.term.name} term
        </p>
      </Link>
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
    cell: ({ row }) => <span className="text-sm">{row.original.topic}</span>,
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
  {
    id: 'actions',
    header: '',
    enableSorting: false,
    cell: ({ row }) => <DuplicateButton note={row.original} />,
  },
];

export function LessonNotesTable({ notes }: { notes: LessonNoteDto[] }) {
  if (notes.length === 0) {
    return (
      <Empty className="border border-dashed border-border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <NotebookPen />
          </EmptyMedia>
          <EmptyTitle>No lesson notes yet</EmptyTitle>
          <EmptyDescription>
            Write your first lesson note for one of your classes — it goes to your HOD or the
            Admin for approval.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return <DataTable columns={columns} data={notes} searchPlaceholder="Search by topic…" />;
}
