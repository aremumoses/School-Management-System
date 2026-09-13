import { AlertTriangle, CalendarCheck, Download, Info, Users } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { PageHeader } from '@/components/dashboard/page-header';
import { StatCard } from '@/components/dashboard/stat-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  getAttendanceRegister,
  getChronicAbsenteeism,
  getClassAttendance,
} from '@/lib/actions/attendance';
import { ATTENDANCE_STATUS_BADGE, ATTENDANCE_STATUS_LABELS } from '@/lib/attendance-status-labels';
import { apiFetch } from '@/lib/api';
import { todayInSchoolTimezone } from '@/lib/school-date';
import type { ClassDto, SubjectDto, TermDto } from '@/lib/types/academic';
import type { StudentDetailDto } from '@/lib/types/students';
import { AttendanceByClassChart, type ClassAttendanceRate } from './attendance-by-class-chart';
import { ClassRegisterFilters, type PeriodOption } from './class-register-filters';
import { ThresholdControl } from './threshold-control';

function initials(firstName: string, lastName: string): string {
  return `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();
}

/** A white section card with Akademi's title row. */
function SectionCard({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl bg-card dark:ring-1 dark:ring-foreground/10">
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5 sm:px-6 sm:pt-6">
        <div className="min-w-0">
          <h2 className="text-lg leading-snug font-semibold text-heading">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

const HEAD_CLASS = 'h-12 font-semibold text-primary dark:text-heading';

export default async function AdminAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{
    threshold?: string;
    registerClassId?: string;
    registerArmId?: string;
    registerDate?: string;
    registerPeriod?: string;
  }>;
}) {
  const params = await searchParams;
  const threshold = Number(params.threshold ?? '20') || 20;
  const today = todayInSchoolTimezone();

  const [classes, currentTerm, subjects] = await Promise.all([
    apiFetch<ClassDto[]>('/classes'),
    apiFetch<TermDto>('/terms/current'),
    apiFetch<SubjectDto[]>('/subjects'),
  ]);

  // Default to the first class/arm so the register has something useful to
  // show immediately, rather than an empty "pick a class" prompt.
  const registerClassId = params.registerClassId ?? classes[0]?.id ?? '';
  const registerArmId =
    params.registerArmId ?? classes.find((c) => c.id === registerClassId)?.arms[0]?.id ?? '';
  const registerDate = params.registerDate ?? today;
  const registerPeriod = params.registerPeriod;

  // The Daily (whole-day) register and each Subject's per-period register
  // are separate rows entirely (see schema.prisma's Attendance comment) —
  // a Subject Teacher's marks only ever show up under their own subject
  // here, never under Daily. Offering both, instead of only ever showing
  // Daily, is what makes a Subject-Teacher-only mark (no Class Teacher
  // assigned) visible to an Admin at all.
  const periodOptions: PeriodOption[] = subjects.flatMap((subject) =>
    subject.classSubjects
      .filter((cs) => cs.classId === registerClassId)
      .map((cs) => ({ classSubjectId: cs.id, subjectName: subject.name })),
  );

  const register = registerArmId
    ? await getAttendanceRegister(registerArmId, registerDate, registerPeriod)
    : [];
  const registerCounts = {
    PRESENT: register.filter((r) => r.status === 'PRESENT').length,
    ABSENT: register.filter((r) => r.status === 'ABSENT').length,
    LATE: register.filter((r) => r.status === 'LATE').length,
    EXCUSED: register.filter((r) => r.status === 'EXCUSED').length,
    notMarked: register.filter((r) => r.status === null).length,
  };
  const registerAllUnmarked = register.length > 0 && registerCounts.notMarked === register.length;

  // If the Daily register is empty, check whether any *period* has been
  // marked for this arm+date instead — surfaced as a hint rather than
  // silently leaving the admin to wonder why nothing shows up, which is
  // exactly the confusion a Subject-Teacher-only mark caused in practice.
  let markedPeriodNames: string[] = [];
  if (!registerPeriod && registerAllUnmarked && periodOptions.length > 0) {
    const periodChecks = await Promise.all(
      periodOptions.map((p) => getClassAttendance(registerArmId, registerDate, p.classSubjectId)),
    );
    markedPeriodNames = periodOptions
      .filter((_, i) => periodChecks[i].length > 0)
      .map((p) => p.subjectName);
  }

  // One school, a handful of arms — a per-arm fetch + in-memory aggregate is
  // simple and fast at this scale. A dedicated school-wide aggregate
  // endpoint would be worth adding if this ever needs to scale past a
  // single school's arm count.
  const arms = classes.flatMap((klass) => klass.arms.map((arm) => ({ klass, arm })));
  const todaysRecordsByArm = await Promise.all(
    arms.map(({ arm }) => getClassAttendance(arm.id, today)),
  );

  let totalMarked = 0;
  let totalPresentOrLate = 0;
  const byClass = new Map<string, { className: string; marked: number; presentOrLate: number }>();
  arms.forEach(({ klass }, i) => {
    const records = todaysRecordsByArm[i];
    const presentOrLate = records.filter((r) => r.status === 'PRESENT' || r.status === 'LATE').length;
    totalMarked += records.length;
    totalPresentOrLate += presentOrLate;
    const entry = byClass.get(klass.id) ?? { className: klass.name, marked: 0, presentOrLate: 0 };
    entry.marked += records.length;
    entry.presentOrLate += presentOrLate;
    byClass.set(klass.id, entry);
  });

  const todaysRate = totalMarked > 0 ? Math.round((totalPresentOrLate / totalMarked) * 1000) / 10 : null;
  const chartData: ClassAttendanceRate[] = [...byClass.values()]
    .filter((c) => c.marked > 0)
    .map((c) => ({
      className: c.className,
      rate: Math.round((c.presentOrLate / c.marked) * 1000) / 10,
    }));

  const flagged = await getChronicAbsenteeism(currentTerm.id, threshold);
  const flaggedWithEnrollment = await Promise.all(
    flagged.map(async (entry) => {
      const student = await apiFetch<StudentDetailDto>(`/students/${entry.studentId}`);
      return { entry, student };
    }),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance"
        description="School-wide attendance rate, per-class daily registers, and chronic absenteeism flags."
        action={
          <Button variant="outline" render={<a href="/api/attendance/export" download />}>
            <Download className="size-4" aria-hidden="true" />
            Export Excel
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Only the whole-day register feeds this rate; the Class Register
            below explains how to find a Subject Teacher's per-period marks. */}
        <StatCard
          label="Today's Attendance Rate"
          value={todaysRate === null ? '—' : `${todaysRate}%`}
          description={
            todaysRate === null
              ? 'No daily attendance has been marked yet today'
              : `${totalPresentOrLate} of ${totalMarked} marked present/late`
          }
          icon={CalendarCheck}
          variant={
            todaysRate === null
              ? 'default'
              : todaysRate >= 90
                ? 'success'
                : todaysRate >= 75
                  ? 'warning'
                  : 'error'
          }
        />
        <StatCard
          label="Students Flagged"
          value={flagged.length}
          description={`Absence rate above ${threshold}% this term`}
          icon={AlertTriangle}
          variant={flagged.length > 0 ? 'warning' : 'default'}
        />
      </div>

      <SectionCard
        title="Class Register"
        description="Shows the whole-day register. Choose a subject under Period to see a Subject Teacher's marks instead."
      >
        <div className="space-y-4 px-5 pt-4 pb-5 sm:px-6">
          <ClassRegisterFilters
            classes={classes}
            classId={registerClassId}
            armId={registerArmId}
            date={registerDate}
            periodOptions={periodOptions}
            classSubjectId={registerPeriod}
          />
          {!registerArmId ? (
            <p className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
              Add a class and arm first to look up its attendance register.
            </p>
          ) : (
            <>
              {markedPeriodNames.length > 0 && (
                <div className="flex items-start gap-2.5 rounded-xl border border-info/30 bg-info-soft px-4 py-3 text-sm text-info-soft-foreground">
                  <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <p>
                    No daily register taken for this date yet, but{' '}
                    <strong>{markedPeriodNames.join(', ')}</strong>{' '}
                    {markedPeriodNames.length === 1 ? 'has' : 'have'} been marked separately — switch
                    the Period filter above to view {markedPeriodNames.length === 1 ? 'it' : 'them'}.
                  </p>
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="success">{registerCounts.PRESENT} Present</Badge>
                <Badge variant="error">{registerCounts.ABSENT} Absent</Badge>
                <Badge variant="warning">{registerCounts.LATE} Late</Badge>
                <Badge variant="info">{registerCounts.EXCUSED} Excused</Badge>
                {registerCounts.notMarked > 0 && (
                  <Badge variant="outline">{registerCounts.notMarked} Not Marked</Badge>
                )}
              </div>
              {register.length === 0 && (
                <p className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
                  No students are actively enrolled in this arm.
                </p>
              )}
            </>
          )}
        </div>

        {registerArmId && register.length > 0 && (
          <div className="border-t border-border">
            <Table>
              <TableHeader>
                <TableRow className="bg-primary/5 hover:bg-primary/5">
                  <TableHead className={`${HEAD_CLASS} pl-5 sm:pl-6`}>Name</TableHead>
                  <TableHead className={`${HEAD_CLASS} hidden sm:table-cell`}>Admission No.</TableHead>
                  <TableHead className={`${HEAD_CLASS} pr-5 sm:pr-6`}>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {register.map((entry) => (
                  <TableRow key={entry.studentId} className="hover:bg-primary/5">
                    <TableCell className="py-3 pl-5 sm:pl-6">
                      <div className="flex items-center gap-3">
                        {/* No room for the initials circle beside a long name
                            and the status badge at phone width. */}
                        <span
                          aria-hidden="true"
                          className="hidden size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary sm:flex dark:text-heading"
                        >
                          {initials(entry.firstName, entry.lastName)}
                        </span>
                        <div className="min-w-0">
                          <Link
                            href={`/admin/students/${entry.studentId}?tab=attendance`}
                            className="font-semibold text-heading hover:text-primary hover:underline dark:hover:text-foreground"
                          >
                            {entry.firstName} {entry.lastName}
                          </Link>
                          <p className="font-mono text-xs text-muted-foreground tabular-nums sm:hidden">
                            {entry.admissionNumber}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden py-3 font-mono font-medium text-primary tabular-nums sm:table-cell dark:text-foreground">
                      {entry.admissionNumber}
                    </TableCell>
                    <TableCell className="py-3 pr-5 sm:pr-6">
                      {entry.status ? (
                        <Badge variant={ATTENDANCE_STATUS_BADGE[entry.status]}>
                          {ATTENDANCE_STATUS_LABELS[entry.status]}
                        </Badge>
                      ) : (
                        <Badge variant="outline">Not Marked</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </SectionCard>

      <AttendanceByClassChart data={chartData} />

      <SectionCard
        title="Chronic Absenteeism"
        description={`Students whose absence rate this term is above ${threshold}%.`}
        action={<ThresholdControl threshold={threshold} />}
      >
        <div className="px-5 pt-4 pb-5 sm:px-6">
          {flaggedWithEnrollment.length === 0 ? (
            <Empty className="border border-dashed border-border py-8">
              <EmptyHeader>
                <EmptyMedia
                  variant="icon"
                  className="size-12 rounded-full bg-primary/10 text-primary [&_svg:not([class*='size-'])]:size-5"
                >
                  <Users />
                </EmptyMedia>
                <EmptyTitle className="text-base font-semibold text-heading">
                  No students flagged
                </EmptyTitle>
                <EmptyDescription>
                  No student&apos;s absence rate exceeds {threshold}% this term.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <ul className="divide-y divide-border">
              {flaggedWithEnrollment.map(({ entry, student }) => {
                const enrollment = student.enrollments[0];
                const fullName = `${student.firstName} ${student.lastName}`;
                return (
                  <li key={entry.studentId} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <span
                      aria-hidden="true"
                      className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary dark:text-heading"
                    >
                      {initials(student.firstName, student.lastName)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-heading">{fullName}</p>
                      <p className="text-xs text-muted-foreground">
                        {enrollment ? `${enrollment.class.name} ${enrollment.arm.name}` : 'Not enrolled'}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5 sm:flex-row sm:items-center sm:gap-3">
                      <Badge variant="error">{entry.absenceRate}% absent</Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        render={<Link href={`/admin/students/${student.id}?tab=attendance`} />}
                        aria-label={`View ${fullName}'s attendance`}
                      >
                        View
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
