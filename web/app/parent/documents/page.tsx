import { PageHeader } from '@/components/dashboard/page-header';
import { DocumentDownloadList } from '@/components/documents/document-download-list';
import { listDocuments } from '@/lib/actions/documents';
import { apiFetch } from '@/lib/api';
import type { StudentListResponse } from '@/lib/types/students';

export default async function ParentDocumentsPage() {
  // includeInactive=true — a graduated/withdrawn child can still have an
  // approved document on file, and should still show by name rather than
  // falling back to the generic "Your child" label.
  const [documents, childrenRes] = await Promise.all([
    listDocuments(),
    apiFetch<StudentListResponse>('/students?includeInactive=true'),
  ]);

  const nameByStudentId = new Map(
    childrenRes.data.map((s) => [s.id, `${s.firstName} ${s.lastName}`]),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documents"
        description="Approved testimonials and certificates for your children."
      />
      <DocumentDownloadList
        documents={documents}
        studentLabel={(studentId) => nameByStudentId.get(studentId) ?? 'Your child'}
      />
    </div>
  );
}
