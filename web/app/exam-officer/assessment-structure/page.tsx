import { AssessmentStructureManager } from '@/app/admin/assessment-structure/assessment-structure-manager';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getAssessmentComponents } from '@/lib/actions/results';
import { apiFetch } from '@/lib/api';
import type { AcademicSessionDto, TermDto } from '@/lib/types/academic';

/** Same manager component as /admin/assessment-structure — Exam Officer has "E" on this per the permissions matrix, and the backend already allows EXAM_OFFICER on every assessment-component write. */
export default async function ExamOfficerAssessmentStructurePage({
  searchParams,
}: {
  searchParams: Promise<{ termId?: string }>;
}) {
  const params = await searchParams;

  const [sessions, currentTerm] = await Promise.all([
    apiFetch<AcademicSessionDto[]>('/academic-sessions'),
    apiFetch<TermDto>('/terms/current').catch(() => null),
  ]);

  const allTerms = sessions.flatMap((s) =>
    s.terms.map((t) => ({ ...t, sessionName: s.name })),
  );

  const selectedTermId = allTerms.some((t) => t.id === params.termId)
    ? params.termId!
    : currentTerm?.id ?? allTerms[0]?.id;

  if (!selectedTermId) {
    return (
      <div className="space-y-6">
        <PageHeader title="Assessment Structure" />
        <p className="text-sm text-muted-foreground">
          Ask an Admin to set up an academic session and term first.
        </p>
      </div>
    );
  }

  const components = await getAssessmentComponents(selectedTermId);
  const selectedTerm = allTerms.find((t) => t.id === selectedTermId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assessment Structure"
        description="Define the CA and exam component weights for each term. Teachers can't enter scores until this is set."
      />

      <div className="flex flex-wrap gap-2">
        {allTerms.map((term) => (
          <a
            key={term.id}
            href={`/exam-officer/assessment-structure?termId=${term.id}`}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              term.id === selectedTermId
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {term.sessionName} — {term.name}
          </a>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Components — {selectedTerm?.sessionName} {selectedTerm?.name} Term
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AssessmentStructureManager
            termId={selectedTermId}
            initialComponents={components}
          />
        </CardContent>
      </Card>
    </div>
  );
}
