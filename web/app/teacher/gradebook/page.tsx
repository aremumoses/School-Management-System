import { AlertTriangle, ClipboardX, TrendingDown, TrendingUp, Users } from 'lucide-react';
import { auth } from '@/auth';
import { PageHeader } from '@/components/dashboard/page-header';
import { StatCard } from '@/components/dashboard/stat-card';
import { AtRiskList } from '@/components/students/at-risk-list';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { getGradebook } from '@/lib/actions/assignments';
import { getMyTeachingAssignments } from '@/lib/actions/attendance';
import { getAtRiskStudents } from '@/lib/actions/students';
import { apiFetch } from '@/lib/api';
import type { AcademicSessionDto, ClassDto } from '@/lib/types/academic';
import { ContextPicker } from './context-picker';
import { DistributionChart } from './distribution-chart';
import { GradebookTable } from './gradebook-table';

export default async function TeacherGradebookPage({
  searchParams,
}: {
  searchParams: Promise<{ context?: string; threshold?: string }>;
}) {
  const params = await searchParams;
  const session = await auth();
  const userId = session!.user.id;
  const threshold = Number(params.threshold ?? '40') || 40;
  const isClassTeacher = session!.user.roles.includes('CLASS_TEACHER');

  const [assignments, sessions, classes] = await Promise.all([
    getMyTeachingAssignments(userId),
    apiFetch<AcademicSessionDto[]>('/academic-sessions'),
    apiFetch<ClassDto[]>('/classes'),
  ]);

  const currentSession = sessions.find((s) => s.terms.some((t) => t.isCurrent));

  // Stage 29 — GET /students/at-risk is CLASS_TEACHER/ADMIN/VICE_PRINCIPAL
  // only, scoped by arm ("classId" in that endpoint's own terms — see
  // AtRiskFlaggingService.getAtRiskStudents' doc comment). A Class
  // Teacher's own arm isn't derivable from classSubjectId (that spans
  // every arm of a Class, not one section), so it's looked up separately
  // here via Arm.classTeacherId, independent of whichever classSubject the
  // rest of this page is currently showing.
  const myArm = isClassTeacher
    ? classes.flatMap((c) => c.arms).find((a) => a.classTeacherId === userId)
    : undefined;
  const atRiskStudents = myArm ? await getAtRiskStudents(myArm.id) : null;

  // One option per class/subject the teacher is assigned to in the current session.
  const seen = new Set<string>();
  const options = assignments
    .filter((a) => a.term?.sessionId === currentSession?.id)
    .filter((a) => {
      if (seen.has(a.classSubjectId)) return false;
      seen.add(a.classSubjectId);
      return true;
    })
    .map((a) => ({
      classSubjectId: a.classSubjectId,
      label: `${a.classSubject!.class.name} — ${a.classSubject!.subject.name}`,
    }));

  if (options.length === 0 || !currentSession) {
    return (
      <div className="space-y-6">
        <PageHeader title="Gradebook" description="Score history and class performance." />
        <Empty className="border border-dashed border-border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ClipboardX />
            </EmptyMedia>
            <EmptyTitle>No classes assigned</EmptyTitle>
            <EmptyDescription>
              You&apos;re not assigned to any class/subject in the current session.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
        {atRiskStudents && (
          <Card>
            <CardHeader>
              <CardTitle>At-Risk Students (Your Class)</CardTitle>
            </CardHeader>
            <CardContent>
              <AtRiskList students={atRiskStudents} />
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  const selected = options.find((o) => o.classSubjectId === params.context) ?? options[0];
  const gradebook = await getGradebook(selected.classSubjectId, currentSession.id, threshold);
  const atRiskCount = gradebook.students.filter((s) => s.atRisk).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gradebook"
        description={`${gradebook.className} ${gradebook.subjectName} — score history across the ${currentSession.name} session. Students below ${gradebook.threshold}% average are flagged.`}
      />

      <ContextPicker options={options} selectedId={selected.classSubjectId} threshold={threshold} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Class Average"
          value={gradebook.classAverage != null ? `${gradebook.classAverage}%` : '—'}
          icon={Users}
        />
        <StatCard
          label="Highest"
          value={gradebook.highest != null ? `${gradebook.highest}%` : '—'}
          icon={TrendingUp}
          variant="success"
        />
        <StatCard
          label="Lowest"
          value={gradebook.lowest != null ? `${gradebook.lowest}%` : '—'}
          icon={TrendingDown}
          variant="warning"
        />
        <StatCard
          label="At-Risk Students"
          value={atRiskCount}
          description={`Below ${gradebook.threshold}% average`}
          icon={Users}
          variant={atRiskCount > 0 ? 'error' : 'default'}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Score Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <DistributionChart data={gradebook.distribution} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Score History</CardTitle>
        </CardHeader>
        <CardContent>
          <GradebookTable gradebook={gradebook} />
        </CardContent>
      </Card>

      {atRiskStudents && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5">
              <AlertTriangle className="size-4 text-error" aria-hidden="true" />
              At-Risk Students (Your Class)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AtRiskList students={atRiskStudents} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
