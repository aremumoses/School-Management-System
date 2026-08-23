import { PageHeader } from '@/components/dashboard/page-header';
import { listExternalExamCandidates } from '@/lib/actions/exam-logistics';
import { apiFetch } from '@/lib/api';
import type { StudentListResponse } from '@/lib/types/students';
import { ExternalExamsView } from './external-exams-view';

export default async function ExternalExamsPage({
  searchParams,
}: {
  searchParams: Promise<{ examBody?: string; sessionYear?: string }>;
}) {
  const params = await searchParams;

  const [candidates, studentList] = await Promise.all([
    listExternalExamCandidates(
      params.examBody,
      params.sessionYear ? Number(params.sessionYear) : undefined,
    ),
    apiFetch<StudentListResponse>('/students?pageSize=100'),
  ]);

  const students = studentList.data
    .filter((s) => s.isActive)
    .map((s) => ({
      id: s.id,
      name: `${s.firstName} ${s.lastName} (${s.admissionNumber})`,
    }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="External Exam Registration"
        description="BECE/WAEC/NECO/NABTEB/JAMB candidate registration and subject combinations."
      />
      <ExternalExamsView
        candidates={candidates}
        students={students}
        initialExamBody={params.examBody ?? ''}
        initialSessionYear={params.sessionYear ?? ''}
      />
    </div>
  );
}
