import { Users } from 'lucide-react';
import { PageHeader } from '@/components/dashboard/page-header';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { listMyLeaveRequests } from '@/lib/actions/hostel-transport';
import { apiFetch } from '@/lib/api';
import type { StudentListResponse } from '@/lib/types/students';
import { LeaveRequestsView } from './leave-requests-view';

export default async function ParentLeaveRequestsPage() {
  const [childrenRes, requests] = await Promise.all([
    apiFetch<StudentListResponse>('/students'),
    listMyLeaveRequests(),
  ]);
  const children = childrenRes.data;

  if (children.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Boarding Leave Requests" />
        <Empty className="border border-dashed border-border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Users />
            </EmptyMedia>
            <EmptyTitle>No children linked to your account</EmptyTitle>
            <EmptyDescription>
              Contact the school office if this doesn&apos;t look right.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Boarding Leave Requests"
        description="Request permission for your ward to leave campus for the weekend/holiday."
      />
      <LeaveRequestsView
        wards={children.map((c) => ({
          id: c.id,
          name: `${c.firstName} ${c.lastName}`,
        }))}
        requests={requests}
      />
    </div>
  );
}
