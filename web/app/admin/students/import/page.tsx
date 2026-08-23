import { PageHeader } from '@/components/dashboard/page-header';
import { apiFetch } from '@/lib/api';
import type { AcademicSessionDto } from '@/lib/types/academic';
import { BulkImportWizard } from './bulk-import-wizard';

export default async function BulkImportPage() {
  const sessions = await apiFetch<AcademicSessionDto[]>('/academic-sessions');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bulk Import Students"
        description="Migrating an existing roster from Excel? Upload it here — nothing is saved until you confirm."
      />
      <BulkImportWizard sessions={sessions} />
    </div>
  );
}
