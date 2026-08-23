import {
  AlertTriangle,
  BookCheck,
  CalendarCheck,
  ClipboardList,
  ClipboardPen,
  Clock,
  FileSpreadsheet,
  MessageSquare,
  Table2,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { auth } from '@/auth';
import { EmptyState } from '@/components/dashboard/empty-state';
import { GreetingHeader } from '@/components/dashboard/greeting-header';
import { QuickActions } from '@/components/dashboard/quick-actions';
import { StatCard } from '@/components/dashboard/stat-card';
import { AtRiskList } from '@/components/students/at-risk-list';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { listTeacherAssignments } from '@/lib/actions/assignments';
import { getMyTeachingAssignments } from '@/lib/actions/attendance';
import { getAtRiskStudents } from '@/lib/actions/students';
import { getMyTimetable } from '@/lib/actions/timetable';
import { apiFetch } from '@/lib/api';
import { isDeadlinePassed } from '@/lib/assignment-status';
import type { AcademicSessionDto, ClassDto, SchoolDto, TermDto } from '@/lib/types/academic';
import type { TeachingAssignmentDto } from '@/lib/types/attendance';
import type { TeacherAssignmentRowDto } from '@/lib/types/assignments';
import type { AtRiskStudentDto } from '@/lib/types/students';
import type { MyTimetableGridDto } from '@/lib/types/timetable';

/**
 * Teacher home — new-design §28 ("Teacher: classes, students, attendance,
 * assignments, exams, results").
 *
 * Built around the school *day* rather than the term: what am I teaching in
 * the next few hours, what is waiting to be marked, and who in my class is
 * slipping. A teacher opens this between lessons, so anything that takes
 * more than a glance belongs on a sub-page.
 */
export default async function TeacherHomePage() {
  const session = await auth();
  const userId = session!.user.id;
  const isClassTeacher = session!.user.roles.includes('CLASS_TEACHER');

  const [school, currentTerm, sessions, teaching, timetable, assignments, classes] =
    await Promise.all([
      safe(() => apiFetch<SchoolDto>('/school')),
      safe(() => apiFetch<TermDto>('/terms/current')),
      safe(() => apiFetch<AcademicSessionDto[]>('/academic-sessions'), [] as AcademicSessionDto[]),
      safe(() => getMyTeachingAssignments(userId), [] as TeachingAssignmentDto[]),
      safe(() => getMyTimetable()),
      safe(() => listTeacherAssignments(), [] as TeacherAssignmentRowDto[]),
      safe(() => apiFetch<ClassDto[]>('/classes'), [] as ClassDto[]),
    ]);

  const currentSession = sessions?.find((entry) =>
    entry.terms.some((term) => term.id === currentTerm?.id),
  );

  // A Class Teacher's own arm isn't derivable from classSubjectId (that
  // spans every arm of a Class, not one section) — same lookup the
  // gradebook does, via Arm.classTeacherId.
  const myArm = isClassTeacher
    ? (classes ?? []).flatMap((entry) => entry.arms).find((arm) => arm.classTeacherId === userId)
    : undefined;
  const atRisk: AtRiskStudentDto[] = myArm
    ? await safe(() => getAtRiskStudents(myArm.id), [] as AtRiskStudentDto[])
    : [];

  const thisTerm = (teaching ?? []).filter((entry) => entry.term?.id === currentTerm?.id);
  const subjectCount = new Set(thisTerm.map((entry) => entry.classSubject.subjectId)).size;
  const classCount = new Set(thisTerm.map((entry) => entry.classSubject.classId)).size;

  const openAssignments = (assignments ?? []).filter(
    (assignment) => !isDeadlinePassed(assignment.dueDate),
  );
  const awaitingMarking = (assignments ?? [])
    .filter((assignment) => isDeadlinePassed(assignment.dueDate) && assignment.submissionCount > 0)
    .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime())
    .slice(0, 5);

  const today = new Date();
  const todayLessons = lessonsForToday(timetable, today);

  // Score entry deadlines are per teaching assignment; the nearest one is
  // the only one worth surfacing here.
  const nextDeadline = thisTerm
    .map((entry) => entry.scoreEntryDeadline)
    .filter((value): value is string => Boolean(value))
    .sort()
    .find((value) => new Date(value) >= today);

  return (
    <div className="space-y-6">
      <GreetingHeader
        name={session?.user.name ?? 'there'}
        schoolName={school?.name}
        session={currentSession?.name}
        term={currentTerm?.name}
        today={today}
        actions={
          <>
            <Button variant="outline" size="lg" render={<Link href="/teacher/attendance" />}>
              <CalendarCheck className="size-4" />
              Mark attendance
            </Button>
            <Button size="lg" render={<Link href="/teacher/scores" />}>
              <FileSpreadsheet className="size-4" />
              Enter scores
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label="Classes"
          value={classCount || '—'}
          description={`${subjectCount || 0} subject${subjectCount === 1 ? '' : 's'} this term`}
          icon={Users}
          variant="violet"
          href="/teacher/gradebook"
        />
        <StatCard
          label="Lessons today"
          value={todayLessons.length}
          description={todayLessons[0] ? `First at ${todayLessons[0].period.startTime}` : 'None scheduled'}
          icon={Table2}
          variant="blue"
          href="/teacher/timetable"
        />
        <StatCard
          label="Open assignments"
          value={openAssignments.length}
          description={
            awaitingMarking.length > 0 ? `${awaitingMarking.length} closed, unmarked` : 'All caught up'
          }
          icon={ClipboardList}
          variant={awaitingMarking.length > 0 ? 'warning' : 'orange'}
          href="/teacher/assignments"
        />
        <StatCard
          label="Students at risk"
          value={isClassTeacher ? atRisk.length : '—'}
          description={
            isClassTeacher
              ? myArm
                ? `In ${myArm.name ?? 'your arm'}`
                : 'No arm assigned to you'
              : 'Class teachers only'
          }
          icon={AlertTriangle}
          variant={atRisk.length > 0 ? 'warning' : 'default'}
        />
      </div>

      {nextDeadline && (
        <div className="flex items-center gap-3 rounded-2xl border border-warning/30 bg-warning-soft px-4 py-3 text-warning-soft-foreground">
          <Clock className="size-4 shrink-0" aria-hidden="true" />
          <p className="text-sm">
            <span className="font-semibold">Score entry closes </span>
            {new Date(nextDeadline).toLocaleDateString('en-NG', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
            .
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto shrink-0"
            render={<Link href="/teacher/scores" />}
          >
            Enter scores
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Today&apos;s lessons</CardTitle>
            <CardAction>
              <Button variant="ghost" size="sm" render={<Link href="/teacher/timetable" />}>
                Full timetable
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {todayLessons.length === 0 ? (
              <EmptyState
                compact
                icon={Clock}
                title="No lessons today"
                description="Your timetable has nothing scheduled for today."
              />
            ) : (
              <ol className="space-y-2">
                {todayLessons.map((lesson) => (
                  <li
                    key={lesson.entry.id}
                    className="flex items-center gap-3 rounded-xl border border-border/70 p-3"
                  >
                    <div className="w-16 shrink-0 text-xs font-medium text-muted-foreground tabular-nums">
                      {lesson.period.startTime}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {lesson.entry.subjectName}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {[lesson.entry.armLabel, lesson.entry.room].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Waiting to be marked</CardTitle>
            <CardAction>
              <Button variant="ghost" size="sm" render={<Link href="/teacher/assignments" />}>
                All assignments
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {awaitingMarking.length === 0 ? (
              <EmptyState
                compact
                icon={BookCheck}
                title="Nothing to mark"
                description="Every closed assignment with submissions has been graded."
              />
            ) : (
              <ul className="space-y-2">
                {awaitingMarking.map((assignment) => (
                  <li key={assignment.id}>
                    <Link
                      href={`/teacher/assignments/${assignment.id}`}
                      className="flex items-center gap-3 rounded-xl border border-border/70 p-3 transition-colors hover:bg-accent/60"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {assignment.title}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {assignment.classSubject.class.name} ·{' '}
                          {assignment.classSubject.subject.name}
                        </p>
                      </div>
                      <Badge variant="info">
                        {assignment.submissionCount} submitted
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {isClassTeacher && (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>At-risk students in your class</CardTitle>
          </CardHeader>
          <CardContent>
            <AtRiskList students={atRisk} />
          </CardContent>
        </Card>
      )}

      <QuickActions
        actions={[
          { label: 'Mark attendance', href: '/teacher/attendance', icon: CalendarCheck, hint: "Today's register" },
          { label: 'Enter scores', href: '/teacher/scores', icon: FileSpreadsheet, hint: 'CA and exam marks' },
          { label: 'New assignment', href: '/teacher/assignments/new', icon: ClipboardList, hint: 'Set homework' },
          { label: 'Lesson notes', href: '/teacher/lesson-notes', icon: ClipboardPen, hint: 'Write and submit' },
          { label: 'Gradebook', href: '/teacher/gradebook', icon: BookCheck, hint: 'Class performance' },
          { label: 'Messages', href: '/teacher/messages', icon: MessageSquare, hint: 'Parents and colleagues' },
        ]}
      />
    </div>
  );
}

/** See the identical helper on the Student home page for the ISO-day note. */
function lessonsForToday(grid: MyTimetableGridDto | null, today: Date) {
  if (!grid) return [];
  const isoDay = today.getDay() || 7;
  const periodById = new Map(grid.periods.map((period) => [period.id, period]));
  return grid.entries
    .filter((entry) => entry.dayOfWeek === isoDay)
    .map((entry) => ({ entry, period: periodById.get(entry.periodId) }))
    .filter(
      (
        lesson,
      ): lesson is {
        entry: (typeof grid.entries)[number];
        period: (typeof grid.periods)[number];
      } => Boolean(lesson.period),
    )
    .sort((a, b) => a.period.sortOrder - b.period.sortOrder);
}

async function safe<T>(fetcher: () => Promise<T>): Promise<T | null>;
async function safe<T>(fetcher: () => Promise<T>, fallback: T): Promise<T>;
async function safe<T>(fetcher: () => Promise<T>, fallback: T | null = null) {
  try {
    return await fetcher();
  } catch {
    return fallback;
  }
}
