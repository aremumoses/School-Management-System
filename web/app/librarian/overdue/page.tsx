import { Download } from 'lucide-react';
import { PageHeader } from '@/components/dashboard/page-header';
import { Button } from '@/components/ui/button';
import { getOverdue } from '@/lib/actions/library';
import { apiFetch } from '@/lib/api';
import type { TermDto } from '@/lib/types/academic';
import { OverdueView } from './overdue-view';

export default async function OverduePage() {
  const [rows, currentTerm] = await Promise.all([
    getOverdue(),
    apiFetch<TermDto>('/terms/current').catch(() => null),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Overdue & Fines"
        description="Real-time list of loans past their due date."
        action={
          <Button
            variant="outline"
            size="sm"
            render={<a href="/api/library-exports/overdue" download />}
          >
            <Download className="size-4" aria-hidden="true" />
            Export to Excel
          </Button>
        }
      />
      <OverdueView rows={rows} currentTermId={currentTerm?.id ?? null} />
    </div>
  );
}
