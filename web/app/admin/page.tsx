import {
  AlertTriangle,
  BookCheck,
  CalendarDays,
  GraduationCap,
  Megaphone,
  PiggyBank,
  Receipt,
  TrendingUp,
  UserPlus,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { auth } from '@/auth';
import { ActivityFeed } from '@/components/dashboard/activity-feed';
import { GreetingHeader } from '@/components/dashboard/greeting-header';
import { QuickActions } from '@/components/dashboard/quick-actions';
import { StatCard } from '@/components/dashboard/stat-card';
import { AtRiskList } from '@/components/students/at-risk-list';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { apiFetch } from '@/lib/api';
import { getAtRiskStudents } from '@/lib/actions/students';
import type {
  AttendanceTrendPoint,
  AuditLogListResponse,
  DashboardSummaryDto,
  PerformanceTrendPoint,
} from '@/lib/types/admin';
import type { AcademicSessionDto, SchoolDto, TermDto } from '@/lib/types/academic';
import type { CollectionSummaryDto } from '@/lib/types/fees';
import type { AtRiskStudentDto } from '@/lib/types/students';
import {
  AttendanceTrendPanel,
  FeeCollectionPanel,
  PerformanceTrendPanel,
} from './dashboard-charts';

/**
 * Admin command centre — new-design §4-§7, laid out on Akademi's dashboard.
 *
 * Reading order is deliberate and matches how a head teacher actually opens
 * this screen: where am I in the year (greeting + session/term), what needs
 * my attention right now (KPI row, exceptions first), what is the shape of
 * the term (charts), then the people and tasks — at-risk students and quick
 * actions in the main column, recent activity in Akademi's right-hand rail.
 *
 * Every panel fetches independently and degrades to its own empty state.
 * That matters more here than anywhere else in the app: this is the first
 * screen after login, and one unpopulated module (a school that hasn't
 * raised invoices yet) must not blank the whole dashboard.
 */
export default async function AdminHomePage() {
  const session = await auth();

  const [summary, atRiskStudents, school, currentTerm, sessions, activity] = await Promise.all([
    safe(() => apiFetch<DashboardSummaryDto>('/admin/dashboard-summary')),
    // Admin is unscoped — no classId, school-wide list (Stage 29).
    safe(() => getAtRiskStudents(), [] as AtRiskStudentDto[]),
    safe(() => apiFetch<SchoolDto>('/school')),
    safe(() => apiFetch<TermDto>('/terms/current')),
    safe(() => apiFetch<AcademicSessionDto[]>('/academic-sessions'), [] as AcademicSessionDto[]),
    safe(() =>
      // Over-fetch: ActivityFeed drops token-rotation noise, so asking for
      // exactly 7 rows would routinely render 2.
      apiFetch<AuditLogListResponse>('/audit-log?page=1&pageSize=40').then((res) => res.data),
      [],
    ),
  ]);

  const currentSession = sessions?.find((entry) =>
    entry.terms.some((term) => term.id === currentTerm?.id),
  );

  // The analytics endpoints are session/term-scoped, so they can only be
  // asked for once the session above has resolved — hence a second wave
  // rather than one flat Promise.all.
  const [attendanceTrend, performanceTrend, collection] = await Promise.all([
    currentSession
      ? safe(
          () =>
            apiFetch<AttendanceTrendPoint[]>(
              `/analytics/attendance-trends?sessionId=${currentSession.id}`,
            ),
          [],
        )
      : Promise.resolve([] as AttendanceTrendPoint[]),
    currentSession
      ? safe(
          () =>
            apiFetch<PerformanceTrendPoint[]>(
              `/analytics/performance-trends?sessionId=${currentSession.id}`,
            ),
          [],
        )
      : Promise.resolve([] as PerformanceTrendPoint[]),
    currentTerm
      ? safe(() =>
          apiFetch<CollectionSummaryDto>(
            `/reports/finance/collection-summary?termId=${currentTerm.id}`,
          ),
        )
      : Promise.resolve(null),
  ]);

  const attendancePoints = (attendanceTrend ?? []).map((point) => ({
    label: point.termName,
    value: point.attendanceRate,
  }));
  const performancePoints = (performanceTrend ?? []).map((point) => ({
    label: point.termName,
    value: point.averageScore,
  }));
  const collectionRows = (collection?.byClass ?? []).map((row) => ({
    className: row.className,
    collected: row.collected,
    outstanding: row.outstanding,
  }));

  const attendanceValue =
    summary?.todayAttendanceRate != null ? `${summary.todayAttendanceRate}%` : '—';
  const collectionValue =
    summary?.termCollectionRate != null ? `${summary.termCollectionRate}%` : '—';
  const attendanceVariant = band(summary?.todayAttendanceRate, 90, 75);
  const collectionVariant = band(summary?.termCollectionRate, 75, 40);

  // Sparklines are only shown where a real series exists. A single data
  // point is not a trend, and inventing a flat line to fill the slot would
  // be a chart that lies.
  const attendanceSpark =
    attendancePoints.length > 1 ? attendancePoints.map((point) => point.value) : undefined;

  const flaggedCount = atRiskStudents?.length ?? 0;

  return (
    <div className="space-y-6">
      <GreetingHeader
        name={session?.user.name ?? 'Admin'}
        schoolName={school?.name}
        session={currentSession?.name}
        term={currentTerm?.name}
        today={new Date()}
        actions={
          <>
            <Button variant="outline" size="lg" render={<Link href="/admin/reports" />}>
              <TrendingUp className="size-4" />
              View reports
            </Button>
            <Button size="lg" render={<Link href="/admin/communication" />}>
              <Megaphone className="size-4" />
              Send announcement
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:gap-6 xl:grid-cols-4">
        <StatCard
          label="Active students"
          value={summary?.totalActiveStudents ?? '—'}
          description="Enrolled this session"
          icon={GraduationCap}
          variant="brand"
          href="/admin/students"
        />
        <StatCard
          label="Active staff"
          value={summary?.totalActiveStaff ?? '—'}
          description="Teaching and non-teaching"
          icon={Users}
          variant="coral"
          href="/admin/staff"
        />
        <StatCard
          label="Today's attendance"
          value={attendanceValue}
          description="Daily (whole-day) records only"
          icon={CalendarDays}
          variant={attendanceVariant}
          trend={attendanceSpark}
          href="/admin/attendance"
        />
        <StatCard
          label="Term fee collection"
          value={collectionValue}
          description="Current term's invoices"
          icon={PiggyBank}
          variant={collectionVariant}
          href="/admin/fees"
        />
        <StatCard
          label="Pending result approvals"
          value={summary?.pendingResultApprovals ?? '—'}
          description="Classes awaiting Admin review"
          icon={BookCheck}
          variant={summary?.pendingResultApprovals ? 'warning' : 'default'}
          href="/admin/results"
        />
        <StatCard
          label="Pending discipline cases"
          value={summary?.pendingSuspensionApprovals ?? '—'}
          description="Proposed suspensions / expulsions"
          icon={AlertTriangle}
          variant={summary?.pendingSuspensionApprovals ? 'error' : 'default'}
          href="/admin/discipline"
        />
        <StatCard
          label="Upcoming events"
          value={summary?.upcomingEventsCount ?? '—'}
          description="Starting in the next 7 days"
          icon={CalendarDays}
          variant="amber"
          href="/admin/calendar"
        />
        <StatCard
          label="Students at risk"
          value={atRiskStudents?.length ?? '—'}
          description="Flagged on attendance or CA scores"
          icon={AlertTriangle}
          variant={atRiskStudents && atRiskStudents.length > 0 ? 'warning' : 'default'}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
        <AttendanceTrendPanel points={attendancePoints} />
        <PerformanceTrendPanel points={performancePoints} />
        <FeeCollectionPanel rows={collectionRows} />
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:gap-6 xl:grid-cols-3">
        <div className="space-y-4 lg:space-y-6 xl:col-span-2">
          <Card className="rounded-xl ring-0 [--card-spacing:--spacing(6)] dark:ring-1">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-heading">At-risk students</CardTitle>
              <CardDescription>
                {flaggedCount === 1
                  ? '1 student flagged on attendance or CA scores'
                  : `${flaggedCount} students flagged on attendance or CA scores`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <AtRiskList students={atRiskStudents ?? []} />
              <Button
                variant="ghost"
                size="lg"
                className="w-full rounded-full bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary dark:text-foreground dark:hover:text-foreground"
                render={<Link href="/admin/students" />}
              >
                View all students
              </Button>
            </CardContent>
          </Card>

          <QuickActions actions={QUICK_ACTIONS} />
        </div>

        <ActivityFeed entries={activity ?? []} />
      </div>
    </div>
  );
}

const QUICK_ACTIONS = [
  {
    label: 'Add a student',
    href: '/admin/students/new',
    icon: GraduationCap,
    hint: 'Guided enrolment',
  },
  { label: 'Add staff', href: '/admin/staff', icon: Users, hint: 'Create a staff record' },
  {
    label: 'Review admissions',
    href: '/admin/admissions',
    icon: UserPlus,
    hint: 'Applications pipeline',
  },
  {
    label: 'Approve results',
    href: '/admin/results',
    icon: BookCheck,
    hint: 'Sign off class results',
  },
  {
    label: 'Send announcement',
    href: '/admin/communication',
    icon: Megaphone,
    hint: 'Broadcast to the school',
  },
  {
    label: 'Fee structure',
    href: '/admin/fees',
    icon: Receipt,
    hint: 'Components and amounts',
  },
];

/**
 * Run a fetch, fall back to a neutral value on failure. The dashboard shows
 * "—" and an empty panel rather than an error page: a partially-configured
 * school (no invoices yet, no results yet) is a normal state here, not a
 * fault, and the two are indistinguishable from the client's side.
 */
async function safe<T>(fetcher: () => Promise<T>): Promise<T | null>;
async function safe<T>(fetcher: () => Promise<T>, fallback: T): Promise<T>;
async function safe<T>(fetcher: () => Promise<T>, fallback: T | null = null) {
  try {
    return await fetcher();
  } catch {
    return fallback;
  }
}

/** Map a 0-100 rate onto the StatCard's semantic variants. */
function band(
  value: number | null | undefined,
  good: number,
  fair: number,
): 'default' | 'success' | 'warning' | 'error' {
  if (value == null) return 'default';
  if (value >= good) return 'success';
  if (value >= fair) return 'warning';
  return 'error';
}
