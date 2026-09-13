import type { ColumnDef } from '@tanstack/react-table';
import { UserPlus } from 'lucide-react';
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
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="hidden size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary md:flex dark:text-heading"
        >
          {`${row.original.firstName[0] ?? ''}${row.original.lastName[0] ?? ''}`.toUpperCase()}
        </span>
        <Link
          href={`/admin/admissions/${row.original.id}`}
          className="font-semibold text-heading hover:text-primary hover:underline dark:hover:text-foreground"
        >
          {row.original.firstName} {row.original.lastName}
        </Link>
      </div>
    ),
  },
  {
    id: 'intendedClassLevel',
    header: 'Class',
    accessorFn: (r) => r.intendedClassLevel,
    cell: ({ row }) => (
      <span className="inline-flex rounded-md bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary dark:text-foreground">
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
          <Button render={<Link href="/apply" target="_blank" />}>
            <UserPlus className="size-4" aria-hidden="true" />
            View Application Form
          </Button>
        }
      />

      {applicants.length === 0 ? (
        <Empty className="rounded-xl bg-card py-12 dark:ring-1 dark:ring-foreground/10">
          <EmptyHeader>
            <EmptyMedia
              variant="icon"
              className="size-12 rounded-full bg-primary/10 text-primary [&_svg:not([class*='size-'])]:size-5"
            >
              <UserPlus />
            </EmptyMedia>
            <EmptyTitle className="text-base font-semibold text-heading">No applications yet</EmptyTitle>
            <EmptyDescription>
              Share the{' '}
              <Link
                href="/apply"
                target="_blank"
                className="font-medium text-primary hover:underline dark:text-foreground"
              >
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
