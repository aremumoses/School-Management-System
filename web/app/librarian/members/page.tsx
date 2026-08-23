import { PageHeader } from '@/components/dashboard/page-header';
import { MembersView } from './members-view';

export default function MembersPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Members & Loans"
        description="Search a student or staff member to see their current loans, borrowing limit, and history."
      />
      <MembersView />
    </div>
  );
}
