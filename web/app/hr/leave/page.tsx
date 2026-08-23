import { CalendarCheck, Download } from 'lucide-react';
import { PageHeader } from '@/components/dashboard/page-header';
import { Button } from '@/components/ui/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { listAllLeaveRequests, listLeaveTypes } from '@/lib/actions/hr';
import { LeaveRequestRow } from './leave-request-row';
import { LeaveTypesManager } from './leave-types-manager';

export default async function HrLeavePage() {
  const [leaveTypes, requests] = await Promise.all([
    listLeaveTypes(),
    listAllLeaveRequests(),
  ]);
  const pending = requests.filter((r) => r.status === 'PENDING');
  const decided = requests.filter((r) => r.status !== 'PENDING');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leave Requests"
        description="Approve or reject staff leave requests. Approving decrements the staff member's balance."
        action={
          <Button variant="outline" render={<a href="/api/hr/leave-balances/export" download />}>
            <Download className="size-4" aria-hidden="true" />
            Export Balances
          </Button>
        }
      />

      <LeaveTypesManager leaveTypes={leaveTypes} />

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Pending ({pending.length})</h2>
        {pending.length === 0 ? (
          <Empty className="border border-dashed border-border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <CalendarCheck />
              </EmptyMedia>
              <EmptyTitle>No pending requests</EmptyTitle>
              <EmptyDescription>New requests will appear here for approval.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="space-y-3">
            {pending.map((r) => (
              <LeaveRequestRow key={r.id} request={r} />
            ))}
          </div>
        )}
      </div>

      {decided.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Decided ({decided.length})</h2>
          <div className="space-y-3">
            {decided.map((r) => (
              <LeaveRequestRow key={r.id} request={r} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
