import { PageHeader } from '@/components/dashboard/page-header';
import { apiFetch } from '@/lib/api';
import type { SchoolDto } from '@/lib/types/academic';
import { GradingScaleCard } from './grading-scale-card';
import { SchoolProfileForm } from './school-profile-form';

export default async function SchoolSettingsPage() {
  const school = await apiFetch<SchoolDto>('/school');

  return (
    <div className="space-y-6">
      <PageHeader
        title="School Profile"
        description="Your school's identity and branding. The colors below appear only on generated documents — they never change this app's own look."
      />
      <SchoolProfileForm school={school} />
      <GradingScaleCard school={school} />
    </div>
  );
}
