import { PageHeader } from '@/components/dashboard/page-header';
import { apiFetch } from '@/lib/api';
import type { StaffDto } from '@/lib/types/staff';
import { TrainingPageClient } from './training-page-client';

export default async function TrainingPage() {
  const staff = await apiFetch<StaffDto[]>('/staff');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Training / CPD Log"
        description="Log professional development attended per staff member, with certificates on file."
      />
      <TrainingPageClient staff={staff} />
    </div>
  );
}
