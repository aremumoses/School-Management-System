import { UserMinus } from 'lucide-react';
import { PageHeader } from '@/components/dashboard/page-header';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { listOffboarding } from '@/lib/actions/hr';
import { apiFetch } from '@/lib/api';
import type { StaffDto } from '@/lib/types/staff';
import { InitiateOffboardingDialog } from './initiate-offboarding-dialog';
import { OffboardingChecklistCard } from './offboarding-checklist-card';

export default async function OffboardingPage() {
  const [staff, checklists] = await Promise.all([apiFetch<StaffDto[]>('/staff'), listOffboarding()]);
  const activeStaff = staff.filter(
    (s) => s.isActive && !checklists.some((c) => c.staffId === s.id && !c.completedAt),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Offboarding"
        description="Exit checklist for departing staff — handover, asset return, and final pay before deactivating their login."
        action={<InitiateOffboardingDialog staff={activeStaff} />}
      />

      {checklists.length === 0 ? (
        <Empty className="border border-dashed border-border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <UserMinus />
            </EmptyMedia>
            <EmptyTitle>No offboarding in progress</EmptyTitle>
            <EmptyDescription>Initiate offboarding for a departing staff member above.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="space-y-4">
          {checklists.map((c) => (
            <OffboardingChecklistCard key={c.id} checklist={c} />
          ))}
        </div>
      )}
    </div>
  );
}
