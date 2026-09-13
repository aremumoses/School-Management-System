'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { BookOpen } from 'lucide-react';
import { DataTable } from '@/components/dashboard/data-table';
import type { ClassDto, SubjectDto } from '@/lib/types/academic';
import { SubjectDetailSheet } from './subject-detail-sheet';

export function SubjectsTable({
  subjects,
  classes,
}: {
  subjects: SubjectDto[];
  classes: ClassDto[];
}) {
  const columns: ColumnDef<SubjectDto, unknown>[] = [
    {
      accessorKey: 'name',
      header: 'Subject',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <BookOpen className="size-4" aria-hidden="true" />
          </span>
          <span className="font-semibold text-heading">{row.original.name}</span>
        </div>
      ),
    },
    {
      accessorKey: 'code',
      header: 'Code',
      cell: ({ row }) =>
        row.original.code ? (
          <span className="font-medium text-primary dark:text-foreground">{row.original.code}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: 'classes',
      accessorFn: (subject) => subject.classSubjects.map((cs) => cs.class.name).join(', '),
      header: 'Offered At',
      cell: ({ row }) =>
        row.original.classSubjects.length === 0 ? (
          <span className="text-muted-foreground">Not mapped yet</span>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {row.original.classSubjects.map((cs) => (
              <span
                key={cs.id}
                className="inline-flex rounded-md bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary dark:text-foreground"
              >
                {cs.class.name}
              </span>
            ))}
          </div>
        ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => <SubjectDetailSheet subject={row.original} classes={classes} />,
    },
  ];

  return <DataTable columns={columns} data={subjects} searchPlaceholder="Search subjects…" />;
}
