import { PageHeader } from '@/components/dashboard/page-header';
import { apiFetch } from '@/lib/api';
import type { AcademicSessionDto, ClassDto } from '@/lib/types/academic';
import type { FeeStructureDto } from '@/lib/types/fees';
import { FeeStructureBuilder } from './fee-structure-builder';

export interface TermOption {
  id: string;
  name: string;
  sessionName: string;
  isCurrent: boolean;
}

export default async function FeeStructuresPage({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string; termId?: string }>;
}) {
  const params = await searchParams;
  const [classes, sessions] = await Promise.all([
    apiFetch<ClassDto[]>('/classes'),
    apiFetch<AcademicSessionDto[]>('/academic-sessions'),
  ]);

  const terms: TermOption[] = sessions
    .flatMap((session) =>
      session.terms.map((term) => ({
        id: term.id,
        name: term.name,
        sessionName: session.name,
        isCurrent: term.isCurrent,
      })),
    )
    .sort((a, b) => (a.isCurrent === b.isCurrent ? 0 : a.isCurrent ? -1 : 1));

  const selectedClassId = classes.some((c) => c.id === params.classId)
    ? params.classId!
    : classes[0]?.id;
  const selectedTermId = terms.some((t) => t.id === params.termId)
    ? params.termId!
    : terms.find((t) => t.isCurrent)?.id ?? terms[0]?.id;

  let structure: FeeStructureDto | null = null;
  if (selectedClassId && selectedTermId) {
    const query = new URLSearchParams({ classId: selectedClassId, termId: selectedTermId });
    const structures = await apiFetch<FeeStructureDto[]>(`/fee-structures?${query.toString()}`);
    structure = structures[0] ?? null;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fee Structure Setup"
        description="Define what each class pays this term, then generate invoices for everyone enrolled."
      />
      <FeeStructureBuilder
        classes={classes}
        terms={terms}
        selectedClassId={selectedClassId}
        selectedTermId={selectedTermId}
        structure={structure}
      />
    </div>
  );
}
