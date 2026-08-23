'use client';

import type { ColumnDef } from '@tanstack/react-table';
import Link from 'next/link';
import { DataTable } from '@/components/dashboard/data-table';
import { Badge } from '@/components/ui/badge';
import type { PayrollRunDto, PayrollRunStatus } from '@/lib/types/hr';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const STATUS_BADGE: Record<PayrollRunStatus, 'warning' | 'secondary' | 'success'> = {
  DRAFT: 'warning',
  REVIEWED: 'secondary',
  APPROVED: 'success',
};

const columns: ColumnDef<PayrollRunDto, unknown>[] = [
  {
    id: 'period',
    header: 'Period',
    accessorFn: (r) => `${MONTH_NAMES[r.month - 1]} ${r.year}`,
    cell: ({ row }) => (
      <Link
        href={`/hr/payroll/${row.original.id}`}
        className="font-medium text-foreground hover:text-primary hover:underline"
      >
        {MONTH_NAMES[row.original.month - 1]} {row.original.year}
      </Link>
    ),
  },
  {
    id: 'status',
    header: 'Status',
    accessorFn: (r) => r.status,
    cell: ({ row }) => <Badge variant={STATUS_BADGE[row.original.status]}>{row.original.status}</Badge>,
  },
  {
    id: 'staffCount',
    header: 'Staff',
    accessorFn: (r) => r._count?.payslips ?? 0,
    cell: ({ row }) => row.original._count?.payslips ?? 0,
  },
];

export function RunsList({ runs }: { runs: PayrollRunDto[] }) {
  return <DataTable columns={columns} data={runs} searchPlaceholder="Search payroll runs…" />;
}
