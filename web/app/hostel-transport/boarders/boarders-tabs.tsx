'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { CalendarCheck } from 'lucide-react';
import { useState } from 'react';
import { DataTable } from '@/components/dashboard/data-table';
import { Badge } from '@/components/ui/badge';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import type { BoarderRow, LeaveOutingRequestDto } from '@/lib/types/hostel-transport';
import { cn } from '@/lib/utils';
import { LeaveRequestRow } from './leave-request-row';

const TABS = [
  { key: 'roster', label: 'Boarder Roster' },
  { key: 'leave', label: 'Leave Requests' },
] as const;

function RosterTable({ boarders }: { boarders: BoarderRow[] }) {
  const columns: ColumnDef<BoarderRow, unknown>[] = [
    {
      id: 'name',
      header: 'Boarder',
      accessorFn: (row) => `${row.firstName} ${row.lastName}`,
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-foreground">
            {row.original.firstName} {row.original.lastName}
          </p>
          <p className="text-xs text-muted-foreground">{row.original.admissionNumber}</p>
        </div>
      ),
    },
    {
      id: 'class',
      header: 'Class',
      accessorFn: (row) => `${row.className ?? ''} ${row.armName ?? ''}`,
      cell: ({ row }) =>
        row.original.className ? `${row.original.className} ${row.original.armName}` : '—',
    },
    {
      id: 'hostel',
      header: 'Hostel',
      accessorFn: (row) => row.hostelName,
    },
    {
      id: 'room',
      header: 'Room / Bed',
      accessorFn: (row) => `${row.roomNumber}-${row.bedNumber}`,
      cell: ({ row }) => (
        <span>
          Room {row.original.roomNumber} — Bed {row.original.bedNumber}
        </span>
      ),
    },
  ];

  if (boarders.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
        No boarders allocated yet.
      </p>
    );
  }

  return <DataTable columns={columns} data={boarders} searchPlaceholder="Search by name/class/room…" />;
}

function LeaveQueue({ requests }: { requests: LeaveOutingRequestDto[] }) {
  const pending = requests.filter((r) => r.status === 'PENDING');
  const decided = requests.filter((r) => r.status !== 'PENDING');

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Pending {pending.length > 0 && `(${pending.length})`}
        </h2>
        {pending.length === 0 ? (
          <Empty className="border border-dashed border-border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <CalendarCheck />
              </EmptyMedia>
              <EmptyTitle>No pending requests</EmptyTitle>
              <EmptyDescription>New leave/outing requests appear here.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="space-y-2">
            {pending.map((r) => (
              <LeaveRequestRow key={r.id} request={r} />
            ))}
          </div>
        )}
      </section>

      {decided.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Decided
          </h2>
          <div className="space-y-2">
            {decided.map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {r.student.firstName} {r.student.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(r.fromDate).toLocaleDateString()} –{' '}
                    {new Date(r.toDate).toLocaleDateString()}
                  </p>
                </div>
                <Badge variant={r.status === 'APPROVED' ? 'success' : 'error'}>{r.status}</Badge>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export function BoardersTabs({
  boarders,
  leaveRequests,
}: {
  boarders: BoarderRow[];
  leaveRequests: LeaveOutingRequestDto[];
}) {
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('roster');
  const pendingCount = leaveRequests.filter((r) => r.status === 'PENDING').length;

  return (
    <div className="space-y-6">
      <div className="flex gap-1">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              tab === key
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80',
            )}
          >
            {label}
            {key === 'leave' && pendingCount > 0 && ` (${pendingCount})`}
          </button>
        ))}
      </div>

      {tab === 'roster' ? (
        <RosterTable boarders={boarders} />
      ) : (
        <LeaveQueue requests={leaveRequests} />
      )}
    </div>
  );
}
