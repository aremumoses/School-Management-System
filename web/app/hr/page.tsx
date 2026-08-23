import { Download, Users } from 'lucide-react';
import { PageHeader } from '@/components/dashboard/page-header';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from '@/components/ui/empty';
import { apiFetch } from '@/lib/api';
import type { StaffDto } from '@/lib/types/staff';
import { StaffTable } from '../admin/staff/staff-table';

export default async function HrStaffDirectoryPage() {
  const staff = await apiFetch<StaffDto[]>('/staff');

  const actions = (
    <Button variant="outline" render={<a href="/api/staff/export" download />}>
      <Download className="size-4" aria-hidden="true" />
      Export Excel
    </Button>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Staff Directory"
        description="Every staff member's bio-data, roles, and HR file."
        action={actions}
      />

      {staff.length === 0 ? (
        <Empty className="border border-dashed border-border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Users />
            </EmptyMedia>
            <EmptyTitle>No staff yet</EmptyTitle>
            <EmptyDescription>Staff are added by an Admin under School Admin.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <StaffTable staff={staff} basePath="/hr/staff" />
      )}
    </div>
  );
}
