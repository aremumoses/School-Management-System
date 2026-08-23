import type { ColumnDef } from '@tanstack/react-table';
import { CheckCircle, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/components/dashboard/page-header';
import { DataTable } from '@/components/dashboard/data-table';
import { ApplicantStatusBadge } from '@/components/admissions/applicant-status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { listApplicants } from '@/lib/actions/admissions';
import type { ApplicantDto } from '@/lib/types/admissions';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

const columns: ColumnDef<ApplicantDto, unknown>[] = [
  {
    id: 'name',
    header: 'Applicant',
    accessorFn: (r) => `${r.firstName} ${r.lastName}`,
    cell: ({ row }) => (
      <Link
        href={`/admin/admissions/${row.original.id}`}
        className="font-medium text-foreground hover:text-primary hover:underline"
      >
        {row.original.firstName} {row.original.lastName}
      </Link>
    ),
  },
  {
    id: 'intendedClassLevel',
    header: 'Class',
    accessorFn: (r) => r.intendedClassLevel,
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {row.original.intendedClassLevel}
      </span>
    ),
  },
  {
    id: 'status',
    header: 'Status',
    accessorFn: (r) => r.status,
    cell: ({ row }) => <ApplicantStatusBadge status={row.original.status} />,
  },
  {
    id: 'fee',
    header: 'Fee',
    cell: ({ row }) =>
      row.original.applicationFeePaid ? (
        <Badge variant="success">Paid</Badge>
      ) : (
        <Badge variant="secondary">Unpaid</Badge>
      ),
  },
  {
    id: 'submitted',
    header: 'Submitted',
    accessorFn: (r) => r.submittedAt,
    cell: ({ row }) => (
      <span className="text-sm tabular-nums text-muted-foreground">
        {formatDate(row.original.submittedAt)}
      </span>
    ),
  },
];

export default async function AdminAdmissionsPage() {
  const applicants = await listApplicants();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admissions"
        description="Review and process admission applications."
        action={
          <Button size="sm" render={<Link href="/apply" target="_blank" />}>
            <UserPlus className="size-4" aria-hidden="true" />
            View Application Form
          </Button>
        }
      />

      {applicants.length === 0 ? (
        <Empty className="border border-dashed border-border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CheckCircle />
            </EmptyMedia>
            <EmptyTitle>No applications yet</EmptyTitle>
            <EmptyDescription>
              Share the{' '}
              <Link href="/apply" target="_blank" className="text-primary hover:underline">
                application form link
              </Link>{' '}
              with prospective families.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <DataTable
          columns={columns}
          data={applicants}
          searchPlaceholder="Search by name, class, or status…"
        />
      )}
    </div>
  );
}
