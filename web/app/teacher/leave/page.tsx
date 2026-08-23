import { PageHeader } from '@/components/dashboard/page-header';
import { LeaveRequestForm } from '@/components/hr/leave-request-form';
import { MyLeaveRequests } from '@/components/hr/my-leave-requests';
import { listLeaveTypes, myLeaveBalances, myLeaveRequests } from '@/lib/actions/hr';

export default async function TeacherLeavePage() {
  const [leaveTypes, balances, requests] = await Promise.all([
    listLeaveTypes(),
    myLeaveBalances(),
    myLeaveRequests(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leave Requests"
        description="Submit a leave request and track its approval status."
      />
      <LeaveRequestForm leaveTypes={leaveTypes} balances={balances} />
      <MyLeaveRequests balances={balances} requests={requests} />
    </div>
  );
}
