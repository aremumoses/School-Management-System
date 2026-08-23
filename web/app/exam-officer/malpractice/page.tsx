import { PageHeader } from '@/components/dashboard/page-header';
import { listExamSessions, listMalpracticeIncidents } from '@/lib/actions/exam-logistics';
import { apiFetch } from '@/lib/api';
import type { StudentListResponse } from '@/lib/types/students';
import { MalpracticeLog } from './malpractice-log';

export default async function MalpracticePage() {
  const [incidents, sessions, studentList] = await Promise.all([
    listMalpracticeIncidents(),
    listExamSessions(),
    apiFetch<StudentListResponse>('/students?pageSize=100'),
  ]);

  const students = studentList.data
    .filter((s) => s.isActive)
    .map((s) => ({ id: s.id, name: `${s.firstName} ${s.lastName} (${s.admissionNumber})` }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Exam Malpractice Log"
        description="Log incidents observed during internal exams — a separate record from general student discipline, cross-referenced by exam session."
      />
      <MalpracticeLog incidents={incidents} sessions={sessions} students={students} />
    </div>
  );
}
