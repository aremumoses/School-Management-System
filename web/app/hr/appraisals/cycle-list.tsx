'use client';

import type { ColumnDef } from '@tanstack/react-table';
import Link from 'next/link';
import { DataTable } from '@/components/dashboard/data-table';
import { Badge } from '@/components/ui/badge';
import type { AppraisalCycleDto, AppraisalCycleStatus } from '@/lib/types/appraisal';

const STATUS_BADGE: Record<AppraisalCycleStatus, 'secondary' | 'success' | 'warning'> = {
  DRAFT: 'secondary',
  ACTIVE: 'success',
  CLOSED: 'warning',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

const columns: ColumnDef<AppraisalCycleDto, unknown>[] = [
  {
    id: 'name',
    header: 'Cycle',
    accessorFn: (c) => c.name,
    cell: ({ row }) => (
      <Link
        href={`/hr/appraisals/${row.original.id}`}
        className="font-medium text-foreground hover:text-primary hover:underline"
      >
        {row.original.name}
      </Link>
    ),
  },
  {
    id: 'period',
    header: 'Period',
    accessorFn: (c) => `${c.periodStart} – ${c.periodEnd}`,
    cell: ({ row }) =>
      `${formatDate(row.original.periodStart)} – ${formatDate(row.original.periodEnd)}`,
  },
  {
    id: 'status',
    header: 'Status',
    accessorFn: (c) => c.status,
    cell: ({ row }) => <Badge variant={STATUS_BADGE[row.original.status]}>{row.original.status}</Badge>,
  },
  {
    id: 'submissions',
    header: 'Submissions',
    accessorFn: (c) => c._count?.submissions ?? 0,
    cell: ({ row }) => row.original._count?.submissions ?? 0,
  },
];

export function CycleList({ cycles }: { cycles: AppraisalCycleDto[] }) {
  return <DataTable columns={columns} data={cycles} searchPlaceholder="Search cycles…" />;
}
