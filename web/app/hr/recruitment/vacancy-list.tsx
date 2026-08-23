'use client';

import type { ColumnDef } from '@tanstack/react-table';
import Link from 'next/link';
import { DataTable } from '@/components/dashboard/data-table';
import { Badge } from '@/components/ui/badge';
import type { JobVacancyDto } from '@/lib/types/hr';

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

const columns: ColumnDef<JobVacancyDto, unknown>[] = [
  {
    id: 'title',
    header: 'Title',
    accessorFn: (v) => v.title,
    cell: ({ row }) => (
      <Link
        href={`/hr/recruitment/${row.original.id}`}
        className="font-medium text-foreground hover:text-primary hover:underline"
      >
        {row.original.title}
      </Link>
    ),
  },
  {
    id: 'status',
    header: 'Status',
    accessorFn: (v) => v.status,
    cell: ({ row }) => (
      <Badge variant={row.original.status === 'OPEN' ? 'success' : 'secondary'}>
        {row.original.status === 'OPEN' ? 'Open' : 'Closed'}
      </Badge>
    ),
  },
  {
    id: 'candidates',
    header: 'Candidates',
    accessorFn: (v) => v._count?.candidates ?? 0,
    cell: ({ row }) => row.original._count?.candidates ?? 0,
  },
  {
    id: 'postedAt',
    header: 'Posted',
    accessorFn: (v) => v.postedAt,
    cell: ({ row }) => formatDate(row.original.postedAt),
  },
  {
    id: 'closesAt',
    header: 'Closes',
    accessorFn: (v) => v.closesAt ?? '',
    cell: ({ row }) => formatDate(row.original.closesAt),
  },
];

export function VacancyList({ vacancies }: { vacancies: JobVacancyDto[] }) {
  return <DataTable columns={columns} data={vacancies} searchPlaceholder="Search vacancies…" />;
}
