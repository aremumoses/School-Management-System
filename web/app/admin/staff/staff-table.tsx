'use client';

import type { ColumnDef } from '@tanstack/react-table';
import Link from 'next/link';
import { DataTable } from '@/components/dashboard/data-table';
import { Badge } from '@/components/ui/badge';
import { ROLE_LABELS } from '@/lib/role-labels';
import type { StaffDto } from '@/lib/types/staff';

function formatDate(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function initials(staff: StaffDto): string {
  return `${staff.firstName[0] ?? ''}${staff.lastName[0] ?? ''}`.toUpperCase();
}

function buildColumns(basePath: string): ColumnDef<StaffDto, unknown>[] {
  return [
    {
      id: 'name',
      accessorFn: (staff) => `${staff.firstName} ${staff.lastName}`,
      header: 'Name',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary dark:text-heading"
          >
            {initials(row.original)}
          </span>
          <Link
            href={`${basePath}/${row.original.id}`}
            className="font-semibold text-heading hover:text-primary hover:underline"
          >
            {row.original.firstName} {row.original.lastName}
          </Link>
        </div>
      ),
    },
    {
      accessorKey: 'email',
      header: 'Email',
      cell: ({ row }) => <span className="text-muted-foreground">{row.original.email}</span>,
    },
    {
      id: 'roles',
      accessorFn: (staff) => staff.roles.map((r) => ROLE_LABELS[r.role]).join(', '),
      header: 'Roles',
      cell: ({ row }) =>
        row.original.roles.length === 0 ? (
          <span className="text-muted-foreground">No roles assigned</span>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {row.original.roles.map((r) => (
              <span
                key={r.id}
                className="inline-flex rounded-md bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary dark:text-foreground"
              >
                {ROLE_LABELS[r.role]}
              </span>
            ))}
          </div>
        ),
    },
    {
      accessorKey: 'employmentDate',
      header: 'Date Employed',
      cell: ({ row }) => (
        <span className="text-muted-foreground">{formatDate(row.original.employmentDate)}</span>
      ),
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }) =>
        row.original.isActive ? (
          <Badge variant="success">Active</Badge>
        ) : (
          <Badge variant="error">Inactive</Badge>
        ),
    },
  ];
}

export function StaffTable({
  staff,
  basePath = '/admin/staff',
}: {
  staff: StaffDto[];
  basePath?: string;
}) {
  return (
    <DataTable columns={buildColumns(basePath)} data={staff} searchPlaceholder="Search staff…" />
  );
}
