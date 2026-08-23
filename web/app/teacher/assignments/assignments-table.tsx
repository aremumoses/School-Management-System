'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { BookOpenCheck } from 'lucide-react';
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
import { isDeadlinePassed } from '@/lib/assignment-status';
import type { TeacherAssignmentRowDto } from '@/lib/types/assignments';

function formatDue(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const columns: ColumnDef<TeacherAssignmentRowDto, unknown>[] = [
  {
    id: 'classSubject',
    accessorFn: (row) => `${row.classSubject.class.name} ${row.classSubject.subject.name}`,
    header: 'Class / Subject',
    cell: ({ row }) => (
      <Link href={`/teacher/assignments/${row.original.id}`} className="block hover:underline">
        <p className="font-medium text-foreground">{row.original.classSubject.subject.name}</p>
        <p className="text-xs text-muted-foreground">{row.original.classSubject.class.name}</p>
      </Link>
    ),
  },
  {
    accessorKey: 'title',
    header: 'Title',
  },
  {
    accessorKey: 'dueDate',
    header: 'Due',
    cell: ({ row }) => {
      const overdue = isDeadlinePassed(row.original.dueDate);
      return (
        <div>
          <span className="tabular-nums text-sm">{formatDue(row.original.dueDate)}</span>
          {overdue && (
            <Badge variant="outline" className="ml-2 text-xs">
              Closed
            </Badge>
          )}
          {row.original.allowLateSubmission && (
            <Badge variant="info" className="ml-2 text-xs">
              Late OK
            </Badge>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: 'submissionCount',
    header: 'Submissions',
    cell: ({ row }) => (
      <span className="tabular-nums font-medium">{row.original.submissionCount}</span>
    ),
  },
];

export function AssignmentsTable({ assignments }: { assignments: TeacherAssignmentRowDto[] }) {
  if (assignments.length === 0) {
    return (
      <Empty className="border border-dashed border-border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <BookOpenCheck />
          </EmptyMedia>
          <EmptyTitle>No assignments yet</EmptyTitle>
          <EmptyDescription>
            Post your first assignment — students in the class are notified automatically.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return <DataTable columns={columns} data={assignments} searchPlaceholder="Search by title…" />;
}
