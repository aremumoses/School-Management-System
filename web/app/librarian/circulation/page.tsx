import { PageHeader } from '@/components/dashboard/page-header';
import { getLibraryPolicy, listBooks } from '@/lib/actions/library';
import { apiFetch } from '@/lib/api';
import type { TermDto } from '@/lib/types/academic';
import { CirculationView } from './circulation-view';

export default async function CirculationPage() {
  const [books, policy, currentTerm] = await Promise.all([
    listBooks(),
    getLibraryPolicy(),
    apiFetch<TermDto>('/terms/current').catch(() => null),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Circulation"
        description="Issue and return books — search by title or borrower name/admission number."
      />
      <CirculationView books={books} policy={policy} currentTermId={currentTerm?.id ?? null} />
    </div>
  );
}
