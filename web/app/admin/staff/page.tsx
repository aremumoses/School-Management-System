import { Download, Upload, Users } from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/components/dashboard/page-header';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { apiFetch } from '@/lib/api';
import type { StaffDto } from '@/lib/types/staff';
import { NewStaffDialog } from './new-staff-dialog';
import { StaffTable } from './staff-table';

export default async function StaffDirectoryPage() {
  const staff = await apiFetch<StaffDto[]>('/staff');

  const actions = (
    <div className="flex items-center gap-2">
      <Button variant="outline" render={<a href="/api/staff/export" download />}>
        <Download className="size-4" aria-hidden="true" />
        Export Excel
      </Button>
      <Button variant="outline" render={<Link href="/admin/staff/import" />}>
        <Upload className="size-4" aria-hidden="true" />
        Bulk Import
      </Button>
      <NewStaffDialog />
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Staff Directory"
        description="Every staff member, their roles, and when they joined."
        action={actions}
      />

      {staff.length === 0 ? (
        <Empty className="border border-dashed border-border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Users />
            </EmptyMedia>
            <EmptyTitle>No staff yet</EmptyTitle>
            <EmptyDescription>
              Add your school&apos;s first staff member to get started.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <NewStaffDialog />
          </EmptyContent>
        </Empty>
      ) : (
        <StaffTable staff={staff} />
      )}
    </div>
  );
}
