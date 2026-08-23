import { AlertTriangle, CalendarCheck, Download, Users } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/dashboard/page-header';
import { StatCard } from '@/components/dashboard/stat-card';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
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
          <Button variant="outline" size="sm" render={<a href="/api/attendance/export" download />}>
            <Download className="size-4" aria-hidden="true" />
            Export Excel
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {todaysRate === null ? (
          <Card className="sm:col-span-2">
            <CardContent className="py-6 text-center text-sm text-muted-foreground">
              No daily attendance has been marked yet today.
              <br />
              <span className="text-xs">
                (This counts only the whole-day register — check the Class Register below with a
                Period selected if a Subject Teacher has marked attendance instead.)
              </span>
            </CardContent>
          </Card>
        ) : (
          <StatCard
            label="Today's Attendance Rate"
            value={`${todaysRate}%`}
            description={`${totalPresentOrLate} of ${totalMarked} marked present/late`}
            icon={CalendarCheck}
            variant={todaysRate >= 90 ? 'success' : todaysRate >= 75 ? 'warning' : 'error'}
          />
        )}
        <StatCard
          label="Students Flagged"
          value={flagged.length}
          description={`Absence rate above ${threshold}% this term`}
          icon={AlertTriangle}
          variant={flagged.length > 0 ? 'warning' : 'default'}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Class Register</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ClassRegisterFilters
            classes={classes}
            classId={registerClassId}
            armId={registerArmId}
            date={registerDate}
            periodOptions={periodOptions}
            classSubjectId={registerPeriod}
          />
          {!registerArmId ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Add a class and arm first to look up its attendance register.
            </p>
          ) : (
            <>
              {markedPeriodNames.length > 0 && (
                <div className="rounded-lg border border-info/30 bg-info-soft px-4 py-3 text-sm text-info-soft-foreground">
                  No daily register taken for this date yet, but{' '}
                  <strong>{markedPeriodNames.join(', ')}</strong> {markedPeriodNames.length === 1 ? 'has' : 'have'}{' '}
                  been marked separately — switch the Period filter above to view{' '}
                  {markedPeriodNames.length === 1 ? 'it' : 'them'}.
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
              {register.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No students are actively enrolled in this arm.
                </p>
              ) : (
                <div className="overflow-hidden rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 font-medium">Name</th>
                        <th className="px-3 py-2 font-medium">Admission No.</th>
                        <th className="px-3 py-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {register.map((entry) => (
                        <tr key={entry.studentId}>
                          <td className="px-3 py-2">
                            <Link
                              href={`/admin/students/${entry.studentId}?tab=attendance`}
                              className="font-medium text-primary hover:underline"
                            >
                              {entry.firstName} {entry.lastName}
                            </Link>
                          </td>
                          <td className="px-3 py-2 font-mono text-muted-foreground tabular-nums">
                            {entry.admissionNumber}
                          </td>
                          <td className="px-3 py-2">
                            {entry.status ? (
                              <Badge variant={ATTENDANCE_STATUS_BADGE[entry.status]}>
                                {ATTENDANCE_STATUS_LABELS[entry.status]}
                              </Badge>
                            ) : (
                              <Badge variant="outline">Not Marked</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Attendance Rate by Class (Today)</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No attendance has been marked yet today.
            </p>
          ) : (
            <AttendanceByClassChart data={chartData} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Chronic Absenteeism</CardTitle>
          <ThresholdControl threshold={threshold} />
        </CardHeader>
        <CardContent>
          {flaggedWithEnrollment.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Users />
                </EmptyMedia>
                <EmptyTitle>No students flagged</EmptyTitle>
                <EmptyDescription>
                  No student&apos;s absence rate exceeds {threshold}% this term.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="space-y-2">
              {flaggedWithEnrollment.map(({ entry, student }) => {
                const enrollment = student.enrollments[0];
                return (
                  <div
                    key={entry.studentId}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {student.firstName} {student.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {enrollment ? `${enrollment.class.name} ${enrollment.arm.name}` : 'Not enrolled'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="error">{entry.absenceRate}% absent</Badge>
                      <Link
                        href={`/admin/students/${student.id}?tab=attendance`}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        View
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
