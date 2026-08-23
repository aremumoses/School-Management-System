'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/dashboard/data-table';
import { Badge } from '@/components/ui/badge';
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
      cell: ({ row }) => <span className="font-medium text-foreground">{row.original.name}</span>,
    },
    {
      accessorKey: 'code',
      header: 'Code',
      cell: ({ row }) => row.original.code ?? <span className="text-muted-foreground">—</span>,
    },
    {
      id: 'classes',
      accessorFn: (subject) => subject.classSubjects.map((cs) => cs.class.name).join(', '),
      header: 'Offered At',
      cell: ({ row }) =>
        row.original.classSubjects.length === 0 ? (
          <span className="text-muted-foreground">Not mapped yet</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {row.original.classSubjects.map((cs) => (
              <Badge key={cs.id} variant="outline">
                {cs.class.name}
              </Badge>
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
