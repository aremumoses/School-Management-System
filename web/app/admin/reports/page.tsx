import { PageHeader } from '@/components/dashboard/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  getAttendanceTrends,
  getPerformanceTrends,
  getSubjectPerformance,
  getTeacherPerformance,
} from '@/lib/actions/admin';
import { apiFetch } from '@/lib/api';
import type { AcademicSessionDto, TermDto } from '@/lib/types/academic';
import { AttendanceTrendChart } from './attendance-trend-chart';
import { ClassPerformanceChart } from './class-performance-chart';
import { PerformanceTrendChart } from './performance-trend-chart';
import { SubjectPerformanceChart } from './subject-performance-chart';

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ sessionId?: string; termId?: string }>;
}) {
  const params = await searchParams;

  const [sessions, currentTerm] = await Promise.all([
    apiFetch<AcademicSessionDto[]>('/academic-sessions'),
    apiFetch<TermDto>('/terms/current').catch(() => null),
  ]);

  const currentSessionId = sessions.find((s) =>
    s.terms.some((t) => t.isCurrent),
  )?.id;

  const selectedSessionId = sessions.some((s) => s.id === params.sessionId)
    ? params.sessionId!
    : currentSessionId ?? sessions[0]?.id;

  const allTerms = sessions.flatMap((s) =>
    s.terms.map((t) => ({ ...t, sessionName: s.name })),
  );
  const selectedTermId = allTerms.some((t) => t.id === params.termId)
    ? params.termId!
    : currentTerm?.id ?? allTerms[0]?.id;

  if (!selectedSessionId || !selectedTermId) {
    return (
      <div className="space-y-6">
        <PageHeader title="Analytics & Reports" />
        <p className="text-sm text-muted-foreground">
          Set up an academic session and term first to see analytics.
        </p>
      </div>
    );
  }

  const [performanceTrends, subjectPerformance, classPerformance, attendanceTrends] =
    await Promise.all([
      getPerformanceTrends(selectedSessionId),
      getSubjectPerformance(selectedTermId),
      getTeacherPerformance(selectedTermId),
      getAttendanceTrends(selectedSessionId),
    ]);

  const selectedSession = sessions.find((s) => s.id === selectedSessionId);
  const selectedTerm = allTerms.find((t) => t.id === selectedTermId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics & Reports"
        description="Score and attendance trends across sessions and terms."
      />

      {/* Session / Term pickers */}
      <div className="flex flex-wrap gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Session</label>
          <div className="flex flex-wrap gap-1">
            {sessions.map((session) => (
              <a
                key={session.id}
                href={`/admin/reports?sessionId=${session.id}&termId=${selectedTermId}`}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  session.id === selectedSessionId
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {session.name}
              </a>
            ))}
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Term (for subject & class charts)</label>
          <div className="flex flex-wrap gap-1">
            {sessions
              .find((s) => s.id === selectedSessionId)
              ?.terms.map((term) => (
                <a
                  key={term.id}
                  href={`/admin/reports?sessionId=${selectedSessionId}&termId=${term.id}`}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    term.id === selectedTermId
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {term.name}
                </a>
              ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Score Trends — {selectedSession?.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <PerformanceTrendChart data={performanceTrends} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Attendance Trends — {selectedSession?.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <AttendanceTrendChart data={attendanceTrends} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Subject Performance — {selectedTerm?.name} Term</CardTitle>
        </CardHeader>
        <CardContent>
          <SubjectPerformanceChart data={subjectPerformance} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Classes Trending Low — {selectedTerm?.name} Term</CardTitle>
        </CardHeader>
        <CardContent>
          <ClassPerformanceChart data={classPerformance} />
        </CardContent>
      </Card>
    </div>
  );
}
