import { PageHeader } from '@/components/dashboard/page-header';
import { StaffImportWizard } from './staff-import-wizard';

export default function StaffImportPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Bulk Import Staff"
        description="Upload an Excel spreadsheet to create multiple staff accounts at once. Nothing is saved until you confirm."
      />
      <StaffImportWizard />
    </div>
  );
}
