import { ClockAlert } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { getReportCardData, getTranscript } from '@/lib/actions/results';
import { apiFetch } from '@/lib/api';
import type { TermDto } from '@/lib/types/academic';
import { PerformanceTrendChart, type TrendPoint } from './performance-trend-chart';
import { ReportCardPreview } from './report-card-preview';

/** Shared between /student/results and /parent/results — only the page-level title/description differ per role. */
export async function ReportCardView({ studentId }: { studentId: string }) {
  const [transcript, currentTerm] = await Promise.all([
    getTranscript(studentId),
    apiFetch<TermDto>('/terms/current'),
  ]);

  const currentEntry = transcript.terms.find((t) => t.termId === currentTerm.id);
  const reportCardData = currentEntry
    ? await getReportCardData(currentEntry.armId, currentTerm.id, studentId)
    : null;

  const trendPoints: TrendPoint[] = transcript.terms
    .filter((t): t is typeof t & { overallAverage: number } => t.overallAverage != null)
    .map((t) => ({ label: `${t.termName} ${t.sessionName}`, average: t.overallAverage }));

  return (
    <div className="space-y-6">
      {!reportCardData ? (
        <Empty className="border border-dashed border-border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ClockAlert />
            </EmptyMedia>
            <EmptyTitle>Not yet published</EmptyTitle>
            <EmptyDescription>
              {currentTerm.name} term results haven&apos;t been published yet. Check back once the
              school has finished reviewing and approving results.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ReportCardPreview data={reportCardData} reportCardUrl={currentEntry?.reportCardUrl ?? null} />
      )}

      {trendPoints.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Performance Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <PerformanceTrendChart data={trendPoints} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
