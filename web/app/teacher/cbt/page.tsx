import { auth } from '@/auth';
import { PageHeader } from '@/components/dashboard/page-header';
import { getMyTeachingAssignments } from '@/lib/actions/attendance';
import { listQuestions, listTests } from '@/lib/actions/cbt';
import { apiFetch } from '@/lib/api';
import type { SubjectDto } from '@/lib/types/academic';
import { CbtTabs } from './cbt-tabs';

export default async function TeacherCbtPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  const session = await auth();
  const userId = session!.user.id;

  const [questions, tests, assignments, subjects] = await Promise.all([
    listQuestions({}),
    listTests(),
    getMyTeachingAssignments(userId),
    apiFetch<SubjectDto[]>('/subjects'),
  ]);

  const seen = new Set<string>();
  const classSubjectOptions = assignments
    .filter((a) => a.term.isCurrent)
    .filter((a) => {
      if (seen.has(a.classSubjectId)) return false;
      seen.add(a.classSubjectId);
      return true;
    })
    .map((a) => ({
      classSubjectId: a.classSubjectId,
      label: `${a.classSubject.class.name} — ${a.classSubject.subject.name}`,
    }));

  const subjectOptions = subjects.map((s) => ({ id: s.id, name: s.name }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="CBT Tests"
        description="Author bank questions, assemble timed tests, and grade essay answers."
      />
      <CbtTabs
        initialTab={params.tab === 'tests' ? 'tests' : 'bank'}
        questions={questions}
        tests={tests}
        subjectOptions={subjectOptions}
        classSubjectOptions={classSubjectOptions}
      />
    </div>
  );
}
