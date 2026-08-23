import {
  BookOpenCheck,
  CalendarCheck,
  ClipboardList,
  Clock,
  Library,
  MessageSquare,
  Table2,
  Timer,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import { auth } from '@/auth';
import { GreetingHeader } from '@/components/dashboard/greeting-header';
import { EmptyState } from '@/components/dashboard/empty-state';
import { QuickActions } from '@/components/dashboard/quick-actions';
import { StatCard } from '@/components/dashboard/stat-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { listStudentAssignments } from '@/lib/actions/assignments';
import { getAttendanceSummary } from '@/lib/actions/attendance';
import { getMyTimetable } from '@/lib/actions/timetable';
import { apiFetch } from '@/lib/api';
import { ASSIGNMENT_STATUS, isDeadlinePassed } from '@/lib/assignment-status';
import { formatNaira } from '@/lib/format';
import type { AcademicSessionDto, SchoolDto, TermDto } from '@/lib/types/academic';
import type { AttendanceSummaryDto } from '@/lib/types/attendance';
import type { InvoiceSummaryDto } from '@/lib/types/fees';
import type { StudentAssignmentDto } from '@/lib/types/assignments';
import type { MyTimetableGridDto } from '@/lib/types/timetable';

/**
 * Student home — new-design §28 ("Student: courses, timetable, assignments,
 * exams, results, attendance").
 *
 * Answers the three questions a student actually opens the app for, in the
 * order they ask them: what have I got today, what is due, and where do I
 * stand. Everything below the fold is a shortcut into the screen that owns
 * the detail — this page never becomes the place you *do* something, only
 * the place you find out you need to.
 */
export default async function StudentHomePage() {
  const session = await auth();
  const studentId = session!.user.id;

  const [school, currentTerm, sessions] = await Promise.all([
    safe(() => apiFetch<SchoolDto>('/school')),
    safe(() => apiFetch<TermDto>('/terms/current')),
    safe(() => apiFetch<AcademicSessionDto[]>('/academic-sessions'), [] as AcademicSessionDto[]),
  ]);

  const [attendance, assignments, timetable, invoices] = await Promise.all([
    currentTerm
      ? safe(() => getAttendanceSummary(studentId, currentTerm.id))
      : Promise.resolve(null),
    safe(() => listStudentAssignments(), [] as StudentAssignmentDto[]),
    safe(() => getMyTimetable()),
    safe(() => apiFetch<InvoiceSummaryDto[]>('/invoices'), [] as InvoiceSummaryDto[]),
  ]);

  const currentSession = sessions?.find((entry) =>
    entry.terms.some((term) => term.id === currentTerm?.id),
  );

  const outstanding = (invoices ?? [])
    .filter((invoice) => invoice.termId === currentTerm?.id)
    .reduce((total, invoice) => total + invoice.balance, 0);

  // "Due" means still actionable: not yet submitted and the deadline has not
  // gone. Overdue work is counted separately because it needs a different
  // kind of attention.
  const openAssignments = (assignments ?? []).filter(
    (assignment) => !assignment.submission && !isDeadlinePassed(assignment.dueDate),
  );
  const overdueCount = (assignments ?? []).filter(
    (assignment) => !assignment.submission && isDeadlinePassed(assignment.dueDate),
  ).length;
  const nextUp = [...openAssignments]
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 4);

  const today = new Date();
  const todayLessons = lessonsForToday(timetable, today);

  return (
    <div className="space-y-6">
      <GreetingHeader
        name={session?.user.name ?? 'there'}
        schoolName={school?.name}
        session={currentSession?.name}
        term={currentTerm?.name}
        today={today}
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="Attendance"
          value={attendance ? `${Math.round(attendance.percentage)}%` : '—'}
          description={attendance ? `${attendance.PRESENT} of ${attendance.total} days` : 'This term'}
          icon={CalendarCheck}
          variant={attendanceVariant(attendance)}
          href="/student/attendance"
        />
        <StatCard
          label="Due soon"
          value={openAssignments.length}
          description={overdueCount > 0 ? `${overdueCount} overdue` : 'Nothing overdue'}
          icon={ClipboardList}
          variant={overdueCount > 0 ? 'warning' : 'violet'}
          href="/student/assignments"
        />
        <StatCard
          label="Fee balance"
          value={formatNaira(outstanding)}
          description={outstanding > 0 ? 'Outstanding this term' : 'Fully paid'}
          icon={Wallet}
          variant={outstanding > 0 ? 'warning' : 'success'}
          href="/student/fees"
        />
        <StatCard
          label="Lessons today"
          value={todayLessons.length}
          description={timetable?.armLabel ?? 'No class assigned'}
          icon={Table2}
          variant="blue"
          href="/student/timetable"
        />
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Today&apos;s lessons</CardTitle>
            <CardAction>
              <Button variant="ghost" size="sm" render={<Link href="/student/timetable" />}>
                Full timetable
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {todayLessons.length === 0 ? (
              <EmptyState
                compact
                icon={Clock}
                title="No lessons scheduled"
                description="Enjoy the break — check your timetable for the rest of the week."
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
                        {[lesson.entry.teacherName, lesson.entry.room].filter(Boolean).join(' · ') ||
                          lesson.period.name}
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
            <CardTitle>Coming up</CardTitle>
            <CardAction>
              <Button variant="ghost" size="sm" render={<Link href="/student/assignments" />}>
                All assignments
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {nextUp.length === 0 ? (
              <EmptyState
                compact
                icon={BookOpenCheck}
                title="Nothing due"
                description="You're all caught up on assignments."
              />
            ) : (
              <ul className="space-y-2">
                {nextUp.map((assignment) => {
                  const status = ASSIGNMENT_STATUS(assignment.submission);
                  return (
                    <li key={assignment.id}>
                      <Link
                        href={`/student/assignments/${assignment.id}`}
                        className="flex items-center gap-3 rounded-xl border border-border/70 p-3 transition-colors hover:bg-accent/60"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">
                            {assignment.title}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {assignment.classSubject.subject.name} · due{' '}
                            {new Date(assignment.dueDate).toLocaleDateString('en-NG', {
                              day: 'numeric',
                              month: 'short',
                            })}
                          </p>
                        </div>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <QuickActions
        title="Jump to"
        actions={[
          { label: 'Report cards', href: '/student/results', icon: BookOpenCheck, hint: 'Scores and grades' },
          { label: 'Messages', href: '/student/messages', icon: MessageSquare, hint: 'Talk to your teachers' },
          { label: 'CBT tests', href: '/student/cbt', icon: Timer, hint: 'Scheduled online tests' },
          { label: 'E-library', href: '/student/library', icon: Library, hint: 'Books and resources' },
        ]}
      />
    </div>
  );
}

/**
 * Pick out today's entries and pair each with its period so the card can
 * show a start time. `dayOfWeek` is ISO (1 = Monday), whereas JS `getDay()`
 * is 0 = Sunday — the `|| 7` maps Sunday onto ISO's 7 rather than 0.
 */
function lessonsForToday(grid: MyTimetableGridDto | null, today: Date) {
  if (!grid) return [];
  const isoDay = today.getDay() || 7;
  const periodById = new Map(grid.periods.map((period) => [period.id, period]));
  return grid.entries
    .filter((entry) => entry.dayOfWeek === isoDay)
    .map((entry) => ({ entry, period: periodById.get(entry.periodId) }))
    .filter((lesson): lesson is { entry: (typeof grid.entries)[number]; period: (typeof grid.periods)[number] } =>
      Boolean(lesson.period),
    )
    .sort((a, b) => a.period.sortOrder - b.period.sortOrder);
}

function attendanceVariant(
  summary: AttendanceSummaryDto | null,
): 'default' | 'success' | 'warning' | 'error' {
  if (!summary || summary.total === 0) return 'default';
  if (summary.percentage >= 90) return 'success';
  if (summary.percentage >= 75) return 'warning';
  return 'error';
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
