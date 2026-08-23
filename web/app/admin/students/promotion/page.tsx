import { PageHeader } from '@/components/dashboard/page-header';
import { apiFetch } from '@/lib/api';
import type { AcademicSessionDto } from '@/lib/types/academic';
import { PromotionWizard } from './promotion-wizard';

export default async function PromotionPage() {
  const sessions = await apiFetch<AcademicSessionDto[]>('/academic-sessions');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Auto-Promotion"
        description="Preview and apply end-of-session promotion outcomes for all students. The system suggests based on published results; you confirm before anything changes."
      />
      <PromotionWizard sessions={sessions} />
    </div>
  );
}
