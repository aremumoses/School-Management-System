import { CalendarX } from 'lucide-react';
import { auth } from '@/auth';
import { PageHeader } from '@/components/dashboard/page-header';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { getAttendanceRoster, getMyTeachingAssignments } from '@/lib/actions/attendance';
import { apiFetch } from '@/lib/api';
import { todayInSchoolTimezone } from '@/lib/school-date';
import type { ClassDto } from '@/lib/types/academic';
import { AttendanceMarker, type MarkingContext } from './attendance-marker';

export default async function TeacherAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ context?: string; date?: string }>;
}) {
  const params = await searchParams;
  const session = await auth();
  const userId = session!.user.id;

  const [classes, assignments] = await Promise.all([
    apiFetch<ClassDto[]>('/classes'),
    getMyTeachingAssignments(userId),
  ]);

  const contexts: MarkingContext[] = [];
  for (const klass of classes) {
    for (const arm of klass.arms) {
      if (arm.classTeacher?.id === userId) {
        contexts.push({
          key: `${arm.id}:daily`,
          armId: arm.id,
          label: `${klass.name} ${arm.name} — Daily Attendance`,
        });
      }
    }
  }
  for (const assignment of assignments.filter((a) => a.term.isCurrent)) {
    const klass = classes.find((c) => c.id === assignment.classSubject.classId);
    if (!klass) continue;
    for (const arm of klass.arms) {
      contexts.push({
        key: `${arm.id}:${assignment.classSubjectId}`,
        armId: arm.id,
        classSubjectId: assignment.classSubjectId,
        label: `${klass.name} ${arm.name} — ${assignment.classSubject.subject.name}`,
      });
    }
  }

  if (contexts.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Attendance" description="Mark daily or per-period attendance for your classes." />
        <Empty className="border border-dashed border-border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CalendarX />
            </EmptyMedia>
            <EmptyTitle>No classes assigned to you</EmptyTitle>
            <EmptyDescription>
              You&apos;re not currently set as a Class Teacher for any arm, or assigned to teach
              any subject this term. Ask an Admin to assign you.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  // Driven by the URL (not just component state) so a refresh — or a
  // shared link — shows exactly the class/date that was being viewed,
  // rather than silently falling back to the first context in the list.
  // That silent fallback is exactly what looked like "marks reset to
  // Present on refresh": the marks were still saved under whichever
  // context was actually used, but a reload always defaulted back to
  // contexts[0], which is a *different* context with nothing marked yet.
  const contextKey = contexts.some((c) => c.key === params.context)
    ? params.context!
    : contexts[0].key;
  const selectedContext = contexts.find((c) => c.key === contextKey)!;
  const date = params.date ?? todayInSchoolTimezone();

  const initialRoster = await getAttendanceRoster(
    selectedContext.armId,
    date,
    selectedContext.classSubjectId,
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Attendance" description="Mark daily or per-period attendance for your classes." />
      <AttendanceMarker
        key={`${contextKey}::${date}`}
        contexts={contexts}
        initialContextKey={contextKey}
        initialDate={date}
        initialRoster={initialRoster}
      />
    </div>
  );
}
