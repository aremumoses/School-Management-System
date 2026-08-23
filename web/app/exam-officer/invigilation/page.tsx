import { PageHeader } from '@/components/dashboard/page-header';
import { getInvigilationRoster } from '@/lib/actions/exam-logistics';
import { apiFetch } from '@/lib/api';
import type { TermDto } from '@/lib/types/academic';
import type { StaffDto } from '@/lib/types/staff';
import { InvigilationRosterView } from './invigilation-roster-view';

export default async function InvigilationPage() {
  const currentTerm = await apiFetch<TermDto>('/terms/current').catch(() => null);

  if (!currentTerm) {
    return (
      <div className="space-y-6">
        <PageHeader title="Invigilation Roster" />
        <p className="text-sm text-muted-foreground">Set a current term first.</p>
      </div>
    );
  }

  const [roster, staff] = await Promise.all([
    getInvigilationRoster(currentTerm.id),
    apiFetch<StaffDto[]>('/staff'),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invigilation Roster"
        description={`${currentTerm.name} term. Assigning a staff member notifies them; their existing duty load across the exam period is shown so no one gets double-booked into two simultaneous halls.`}
      />
      <InvigilationRosterView roster={roster} staff={staff} />
    </div>
  );
}
