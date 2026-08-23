import {
  AlertTriangle,
  BookCheck,
  ClipboardList,
  FileBadge,
  FileSpreadsheet,
  Table2,
  TrendingUp,
  UserCheck,
} from 'lucide-react';
import Link from 'next/link';
import { auth } from '@/auth';
import { EmptyState } from '@/components/dashboard/empty-state';
import { GreetingHeader } from '@/components/dashboard/greeting-header';
import { QuickActions } from '@/components/dashboard/quick-actions';
import { StatCard } from '@/components/dashboard/stat-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getSubjectComparisonStats } from '@/lib/actions/exam-logistics';
import { getResultStatus } from '@/lib/actions/results';
import { apiFetch } from '@/lib/api';
import type { AcademicSessionDto, ClassDto, SchoolDto, TermDto } from '@/lib/types/academic';
import type { SubjectComparisonRow } from '@/lib/types/exam-logistics';
import type { ResultStatusDto } from '@/lib/types/results';
import { SubjectPassRatePanel } from './exam-charts';

/**
 * Exam Officer overview — new-design §16 ("result dashboard: student
 * average, class average, subject average, grade distribution").
 *
 * The organising question is *where is each arm stuck*: collation is a
 * pipeline, and the officer's job is finding the arm that has stalled, not
 * reading averages. So the pipeline counts lead, the per-arm list names the
 * blockers, and analysis sits underneath.
 */
export default async function ExamOfficerHomePage() {
  const session = await auth();

  const [school, currentTerm, sessions, classes] = await Promise.all([
    safe(() => apiFetch<SchoolDto>('/school')),
    safe(() => apiFetch<TermDto>('/terms/current')),
    safe(() => apiFetch<AcademicSessionDto[]>('/academic-sessions'), [] as AcademicSessionDto[]),
    safe(() => apiFetch<ClassDto[]>('/classes'), [] as ClassDto[]),
  ]);

  const currentSession = sessions?.find((entry) =>
    entry.terms.some((term) => term.id === currentTerm?.id),
  );
  const arms = (classes ?? []).flatMap((entry) =>
    entry.arms.map((arm) => ({ ...arm, className: entry.name })),
  );

  const [statuses, subjectComparison] = await Promise.all([
    currentTerm
      ? Promise.all(
          arms.map(async (arm) => ({
            arm,
            // Per-arm, and independently caught: one arm with no scores
            // must not take the whole pipeline view down with it.
            status: await safe(() => getResultStatus(arm.id, currentTerm.id)),
          })),
        )
      : Promise.resolve([] as { arm: (typeof arms)[number]; status: ResultStatusDto | null }[]),
    currentTerm
      ? safe(() => getSubjectComparisonStats(currentTerm.id), [] as SubjectComparisonRow[])
      : Promise.resolve([] as SubjectComparisonRow[]),
  ]);

  const withStatus = statuses.filter(
    (entry): entry is { arm: (typeof arms)[number]; status: ResultStatusDto } =>
      entry.status !== null,
  );
  const readyToCollate = withStatus.filter(
    (entry) =>
      entry.status.allSubjectsLocked &&
      (entry.status.stage === 'SCORES_IN_PROGRESS' ||
        entry.status.stage === 'PENDING_COLLATION' ||
        entry.status.stage === 'RETURNED'),
  );
  const blocked = withStatus
    .filter((entry) => entry.status.outstandingSubjects.length > 0)
    .sort((a, b) => b.status.outstandingSubjects.length - a.status.outstandingSubjects.length)
    .slice(0, 6);
  const publishedCount = withStatus.filter((entry) => entry.status.publishedAt).length;
  const returnedCount = withStatus.filter((entry) => entry.status.stage === 'RETURNED').length;

  const passRateRows = (subjectComparison ?? [])
    .filter((row): row is SubjectComparisonRow & { passRate: number } => row.passRate != null)
    .map((row) => ({ subjectName: row.subjectName, passRate: row.passRate }))
    .sort((a, b) => a.passRate - b.passRate);

  const weakest = passRateRows[0];

  return (
    <div className="space-y-6">
      <GreetingHeader
        name={session?.user.name ?? 'there'}
        schoolName={school?.name}
        session={currentSession?.name}
        term={currentTerm?.name}
        today={new Date()}
        actions={
          <>
            <Button variant="outline" size="lg" render={<Link href="/exam-officer/broadsheet" />}>
              <FileSpreadsheet className="size-4" />
              Broadsheet
            </Button>
            <Button size="lg" render={<Link href="/exam-officer/result-approvals" />}>
              <BookCheck className="size-4" />
              Result approvals
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label="Arms tracked"
          value={withStatus.length || '—'}
          description={currentTerm ? `${currentTerm.name} term` : 'No current term'}
          icon={Table2}
          variant="violet"
          href="/exam-officer/result-approvals"
        />
        <StatCard
          label="Ready to collate"
          value={readyToCollate.length}
          description="Every subject locked"
          icon={BookCheck}
          variant={readyToCollate.length > 0 ? 'success' : 'default'}
          href="/exam-officer/result-approvals"
        />
        <StatCard
          label="Waiting on scores"
          value={blocked.length}
          description="Arms with unlocked subjects"
          icon={AlertTriangle}
          variant={blocked.length > 0 ? 'warning' : 'default'}
          href="/exam-officer/result-approvals"
        />
        <StatCard
          label="Published"
          value={publishedCount}
          description={returnedCount > 0 ? `${returnedCount} returned for fixes` : 'Released to parents'}
          icon={FileBadge}
          variant={returnedCount > 0 ? 'warning' : 'blue'}
          href="/exam-officer/transcripts"
        />
      </div>

      {weakest && weakest.passRate < 50 && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-warning/30 bg-warning-soft px-4 py-3 text-warning-soft-foreground">
          <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
          <p className="text-sm">
            <span className="font-semibold">{weakest.subjectName}</span> is the weakest subject this
            term at a {weakest.passRate.toFixed(1)}% pass rate.
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto shrink-0"
            render={<Link href="/exam-officer/statistics" />}
          >
            Analyse
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        <SubjectPassRatePanel rows={passRateRows} />
      </div>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Arms still waiting on scores</CardTitle>
          <CardAction>
            <Button variant="ghost" size="sm" render={<Link href="/exam-officer/result-approvals" />}>
              Full pipeline
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          {blocked.length === 0 ? (
            <EmptyState
              compact
              icon={BookCheck}
              title="Every arm is up to date"
              description="No outstanding subject locks for the current term."
            />
          ) : (
            <ul className="divide-y divide-border">
              {blocked.map(({ arm, status }) => (
                <li key={arm.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {arm.className} {arm.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {status.outstandingSubjects
                        .slice(0, 3)
                        .map((subject) => subject.subjectName)
                        .join(', ')}
                      {status.outstandingSubjects.length > 3 &&
                        ` +${status.outstandingSubjects.length - 3} more`}
                    </p>
                  </div>
                  <Badge variant="warning" className="shrink-0">
                    {status.outstandingSubjects.length} outstanding
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <QuickActions
        actions={[
          { label: 'Exam timetable', href: '/exam-officer/exam-timetable', icon: Table2, hint: 'Schedule papers and halls' },
          { label: 'Invigilation roster', href: '/exam-officer/invigilation', icon: UserCheck, hint: 'Assign staff to halls' },
          { label: 'Broadsheet', href: '/exam-officer/broadsheet', icon: FileSpreadsheet, hint: 'Whole-arm score sheet' },
          { label: 'Transcripts', href: '/exam-officer/transcripts', icon: FileBadge, hint: 'Generate and export' },
          { label: 'Malpractice log', href: '/exam-officer/malpractice', icon: ClipboardList, hint: 'Record an incident' },
          { label: 'Statistics', href: '/exam-officer/statistics', icon: TrendingUp, hint: 'Pass rates and comparisons' },
        ]}
      />
    </div>
  );
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
