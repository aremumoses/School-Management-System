import { GenerateDocumentForm } from '@/components/documents/generate-document-form';
import { DocumentsTable } from '@/components/documents/documents-table';
import { PageHeader } from '@/components/dashboard/page-header';
import { listDocuments } from '@/lib/actions/documents';
import { apiFetch } from '@/lib/api';
import type { StudentListResponse } from '@/lib/types/students';

export default async function AdminDocumentsPage() {
  // includeInactive=true — a testimonial is very often requested for a
  // student who has already graduated or withdrawn; the default student
  // list excludes those, which would otherwise make their existing
  // documents (and the ability to request new ones) silently disappear.
  const [documents, studentList] = await Promise.all([
    listDocuments(),
    apiFetch<StudentListResponse>('/students?pageSize=100&includeInactive=true'),
  ]);

  const studentById = new Map(studentList.data.map((s) => [s.id, s]));

  const rows = documents
    .map((document) => {
      const student = studentById.get(document.studentId);
      if (!student) return null;
      const enrollment = student.enrollments[0];
      return {
        document,
        student: {
          firstName: student.firstName,
          lastName: student.lastName,
          admissionNumber: student.admissionNumber,
          gender: student.gender,
          className: enrollment ? `${enrollment.class.name} ${enrollment.arm.name}` : null,
        },
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documents"
        description="Request testimonials/certificates and approve drafts before they're signed and downloadable."
        action={
          <GenerateDocumentForm
            students={studentList.data.map((s) => {
              const enrollment = s.enrollments[0];
              return {
                id: s.id,
                firstName: s.firstName,
                lastName: s.lastName,
                admissionNumber: s.admissionNumber,
                gender: s.gender,
                className: enrollment ? `${enrollment.class.name} ${enrollment.arm.name}` : null,
                isActive: s.isActive,
              };
            })}
          />
        }
      />
      <DocumentsTable rows={rows} />
    </div>
  );
}
