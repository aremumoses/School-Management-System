import { Info, SlidersHorizontal } from 'lucide-react';
import { PageHeader } from '@/components/dashboard/page-header';
import { getAssessmentComponents } from '@/lib/actions/results';
import { apiFetch } from '@/lib/api';
import type { AcademicSessionDto, TermDto } from '@/lib/types/academic';
import { AssessmentStructureManager } from './assessment-structure-manager';
import { TermPillNav } from './term-pill-nav';

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
        <p className="rounded-xl bg-card px-6 py-10 text-center text-sm text-muted-foreground dark:ring-1 dark:ring-foreground/10">
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

      <TermPillNav
        terms={allTerms}
        selectedTermId={selectedTermId}
        basePath="/admin/assessment-structure"
      />

      <section className="overflow-hidden rounded-xl bg-card dark:ring-1 dark:ring-foreground/10">
        <div className="flex items-center gap-4 border-b border-border px-5 py-4 sm:px-6 sm:py-5">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <SlidersHorizontal className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-heading">Components</h2>
            <p className="text-sm text-muted-foreground">
              {selectedTerm?.sessionName} {selectedTerm?.name} Term · select a value to edit it
            </p>
          </div>
        </div>
        <AssessmentStructureManager termId={selectedTermId} initialComponents={components} />
      </section>

      <p className="flex items-start gap-2 text-sm text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        Changes take effect immediately. Teachers cannot submit scores until the components for
        their term are set up. Existing scores are not affected by weight changes.
      </p>
    </div>
  );
}
