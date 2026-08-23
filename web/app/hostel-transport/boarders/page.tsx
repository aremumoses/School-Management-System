import { PageHeader } from '@/components/dashboard/page-header';
import { listBoarders, listLeaveRequests } from '@/lib/actions/hostel-transport';
import { BoardersTabs } from './boarders-tabs';

export default async function BoardersPage() {
  const [boarders, leaveRequests] = await Promise.all([
    listBoarders(),
    listLeaveRequests(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Boarder Roster"
        description="Every boarder, searchable by class/room, plus leave/outing request approvals."
      />
      <BoardersTabs boarders={boarders} leaveRequests={leaveRequests} />
    </div>
  );
}
