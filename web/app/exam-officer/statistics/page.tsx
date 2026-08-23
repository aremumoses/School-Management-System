import { PageHeader } from '@/components/dashboard/page-header';
import { getPassRateStats, getSubjectComparisonStats } from '@/lib/actions/exam-logistics';
import { apiFetch } from '@/lib/api';
import type { ClassDto, SubjectDto, TermDto } from '@/lib/types/academic';
import { StatisticsView } from './statistics-view';

export default async function StatisticsPage() {
  const currentTerm = await apiFetch<TermDto>('/terms/current').catch(() => null);

  if (!currentTerm) {
    return (
      <div className="space-y-6">
        <PageHeader title="Statistical Analysis" />
        <p className="text-sm text-muted-foreground">Set a current term first.</p>
      </div>
    );
  }

  const [passRate, subjectComparison, classes, subjects] = await Promise.all([
    getPassRateStats(currentTerm.id),
    getSubjectComparisonStats(currentTerm.id),
    apiFetch<ClassDto[]>('/classes'),
    apiFetch<SubjectDto[]>('/subjects'),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Statistical Analysis"
        description={`${currentTerm.name} term. Pass-rate per subject/class and a schoolwide subject comparison — item analysis is a later Phase 3 addition.`}
      />
      <StatisticsView
        termId={currentTerm.id}
        passRate={passRate}
        subjectComparison={subjectComparison}
        classes={classes}
        subjects={subjects}
      />
    </div>
  );
}
