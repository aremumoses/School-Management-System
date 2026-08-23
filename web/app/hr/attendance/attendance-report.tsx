'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/dashboard/data-table';
import type { StaffAttendanceDto } from '@/lib/types/hr';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

const columns: ColumnDef<StaffAttendanceDto, unknown>[] = [
  {
    id: 'staff',
    header: 'Staff',
    accessorFn: (r) => `${r.staff?.firstName ?? ''} ${r.staff?.lastName ?? ''}`,
  },
  {
    id: 'date',
    header: 'Date',
    accessorFn: (r) => r.date,
    cell: ({ row }) => formatDate(row.original.date),
  },
  {
    id: 'clockIn',
    header: 'Clock In',
    accessorFn: (r) => r.clockIn ?? '',
    cell: ({ row }) => formatTime(row.original.clockIn),
  },
  {
    id: 'clockOut',
    header: 'Clock Out',
    accessorFn: (r) => r.clockOut ?? '',
    cell: ({ row }) => formatTime(row.original.clockOut),
  },
];

export function AttendanceReport({ records }: { records: StaffAttendanceDto[] }) {
  return <DataTable columns={columns} data={records} searchPlaceholder="Search by staff name…" />;
}
