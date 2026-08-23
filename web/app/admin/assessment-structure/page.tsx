import { PageHeader } from '@/components/dashboard/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getAssessmentComponents } from '@/lib/actions/results';
import { apiFetch } from '@/lib/api';
import type { AcademicSessionDto, TermDto } from '@/lib/types/academic';
import { AssessmentStructureManager } from './assessment-structure-manager';

export default async function AssessmentStructurePage({
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
          Set up an academic session and term first.
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
        description="Define the CA and exam component weights for each term. These apply school-wide unless overridden per subject."
      />

      {/* Term picker */}
      <div className="flex flex-wrap gap-2">
        {allTerms.map((term) => (
          <a
            key={term.id}
            href={`/admin/assessment-structure?termId=${term.id}`}
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

      <p className="text-xs text-muted-foreground">
        Changes take effect immediately. Teachers cannot submit scores until the components for
        their term are set up. Existing scores are not affected by weight changes.
      </p>
    </div>
  );
}
