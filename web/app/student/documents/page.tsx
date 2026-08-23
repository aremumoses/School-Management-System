import { PageHeader } from '@/components/dashboard/page-header';
import { DocumentDownloadList } from '@/components/documents/document-download-list';
import { listDocuments } from '@/lib/actions/documents';

export default async function StudentDocumentsPage() {
  const documents = await listDocuments();

  return (
    <div className="space-y-6">
      <PageHeader title="Documents" description="Your approved testimonials and certificates." />
      <DocumentDownloadList documents={documents} />
    </div>
  );
}
