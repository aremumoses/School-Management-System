import { PageHeader } from '@/components/dashboard/page-header';
import { listExamHalls, listExamSessions } from '@/lib/actions/exam-logistics';
import { apiFetch } from '@/lib/api';
import type { ClassDto, SubjectDto, TermDto } from '@/lib/types/academic';
import { ExamTimetableView } from './exam-timetable-view';
import { HallsManager } from './halls-manager';

export default async function ExamTimetablePage() {
  const [classes, subjects, currentTerm, halls] = await Promise.all([
    apiFetch<ClassDto[]>('/classes'),
    apiFetch<SubjectDto[]>('/subjects'),
    apiFetch<TermDto>('/terms/current').catch(() => null),
    listExamHalls(),
  ]);

  if (!currentTerm) {
    return (
      <div className="space-y-6">
        <PageHeader title="Exam Timetable" />
        <p className="text-sm text-muted-foreground">Set a current term first.</p>
      </div>
    );
  }

  const sessions = await listExamSessions(currentTerm.id);

  const armOptions = classes.flatMap((klass) =>
    klass.arms.map((arm) => ({
      id: arm.id,
      classId: klass.id,
      label: `${klass.name} ${arm.name}`,
    })),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Exam Timetable"
        description={`${currentTerm.name} term. Scheduling an exam session that clashes with the regular class timetable, or another exam session for the same arm, is rejected with the exact clash named.`}
      />
      <HallsManager halls={halls} />
      <ExamTimetableView
        termId={currentTerm.id}
        sessions={sessions}
        armOptions={armOptions}
        subjects={subjects}
        halls={halls}
      />
    </div>
  );
}
