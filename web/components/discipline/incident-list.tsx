'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Gavel } from 'lucide-react';
import Link from 'next/link';
import { ActionStatusBadge, SeverityBadge } from '@/components/discipline/severity-badge';
import { DataTable } from '@/components/dashboard/data-table';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import type { IncidentWithActionsDto } from '@/lib/types/discipline';

interface IncidentRow {
  incident: IncidentWithActionsDto;
  studentName: string;
}

function latestStatusLabel(incident: IncidentWithActionsDto): string {
  if (incident.actions.length === 0) return 'No action proposed';
  const latest = incident.actions[incident.actions.length - 1];
  return latest.status;
}

export function IncidentList({
  rows,
  basePath,
}: {
  rows: IncidentRow[];
  basePath: string;
}) {
  const columns: ColumnDef<IncidentRow, unknown>[] = [
    {
      id: 'student',
      header: 'Student',
      accessorFn: (row) => row.studentName,
      cell: ({ row }) => (
        <Link
          href={`${basePath}/${row.original.incident.id}`}
          className="font-medium text-foreground hover:text-primary hover:underline"
        >
          {row.original.studentName}
        </Link>
      ),
    },
    {
      id: 'severity',
      header: 'Severity',
      accessorFn: (row) => row.incident.severity,
      cell: ({ row }) => <SeverityBadge severity={row.original.incident.severity} />,
    },
    {
      id: 'status',
      header: 'Status',
      accessorFn: (row) => latestStatusLabel(row.incident),
      cell: ({ row }) => {
        const incident = row.original.incident;
        if (incident.actions.length === 0) {
          return <span className="text-sm text-muted-foreground">No action proposed</span>;
        }
        return <ActionStatusBadge status={incident.actions[incident.actions.length - 1].status} />;
      },
    },
    {
      id: 'date',
      header: 'Date',
      accessorFn: (row) => row.incident.date,
      cell: ({ row }) => (
        <span className="text-sm tabular-nums text-muted-foreground">
          {new Date(row.original.incident.date).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </span>
      ),
    },
  ];

  if (rows.length === 0) {
    return (
      <Empty className="border border-dashed border-border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Gavel />
          </EmptyMedia>
          <EmptyTitle>No incidents logged</EmptyTitle>
          <EmptyDescription>Cases you log or have visibility into will appear here.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return <DataTable columns={columns} data={rows} searchPlaceholder="Search by student…" />;
}
