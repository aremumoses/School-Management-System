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

function buildColumns(basePath: string): ColumnDef<StaffDto, unknown>[] {
  return [
    {
      id: 'name',
      accessorFn: (staff) => `${staff.firstName} ${staff.lastName}`,
      header: 'Name',
      cell: ({ row }) => (
        <Link
          href={`${basePath}/${row.original.id}`}
          className="font-medium text-foreground hover:text-primary hover:underline"
        >
          {row.original.firstName} {row.original.lastName}
        </Link>
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
          <div className="flex flex-wrap gap-1">
            {row.original.roles.map((r) => (
              <Badge key={r.id} variant="outline">
                {ROLE_LABELS[r.role]}
              </Badge>
            ))}
          </div>
        ),
    },
    {
      accessorKey: 'employmentDate',
      header: 'Date Employed',
      cell: ({ row }) => formatDate(row.original.employmentDate),
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
