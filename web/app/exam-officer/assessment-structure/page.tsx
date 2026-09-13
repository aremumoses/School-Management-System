import { SlidersHorizontal } from 'lucide-react';
import { AssessmentStructureManager } from '@/app/admin/assessment-structure/assessment-structure-manager';
import { TermPillNav } from '@/app/admin/assessment-structure/term-pill-nav';
import { PageHeader } from '@/components/dashboard/page-header';
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
        <p className="rounded-xl bg-card px-6 py-10 text-center text-sm text-muted-foreground dark:ring-1 dark:ring-foreground/10">
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

      <TermPillNav
        terms={allTerms}
        selectedTermId={selectedTermId}
        basePath="/exam-officer/assessment-structure"
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
    </div>
  );
}
