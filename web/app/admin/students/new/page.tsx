import { PageHeader } from '@/components/dashboard/page-header';
import { apiFetch } from '@/lib/api';
import type { AcademicSessionDto, ClassDto } from '@/lib/types/academic';
import { AddStudentWizard } from './add-student-wizard';

export default async function NewStudentPage() {
  const [classes, sessions] = await Promise.all([
    apiFetch<ClassDto[]>('/classes'),
    apiFetch<AcademicSessionDto[]>('/academic-sessions'),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Add Student"
        description="Bio-data, guardian details, and class placement — all in one guided flow."
      />
      <AddStudentWizard classes={classes} sessions={sessions} />
    </div>
  );
}
