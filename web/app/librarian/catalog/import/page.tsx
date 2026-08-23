import { PageHeader } from '@/components/dashboard/page-header';
import { BulkImportWizard } from './bulk-import-wizard';

export default function LibraryBulkImportPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Bulk Import Catalog"
        description="Digitize an existing collection from a spreadsheet."
      />
      <BulkImportWizard />
    </div>
  );
}
