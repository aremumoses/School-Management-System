import { PageHeader } from '@/components/dashboard/page-header';
import { apiFetch } from '@/lib/api';
import type { AcademicSessionDto, ClassDto, SubjectDto } from '@/lib/types/academic';
import { ScoresImportWizard } from './scores-import-wizard';

export default async function ScoresBulkImportPage() {
  const [sessions, classes, subjects] = await Promise.all([
    apiFetch<AcademicSessionDto[]>('/academic-sessions'),
    apiFetch<ClassDto[]>('/classes'),
    apiFetch<SubjectDto[]>('/subjects'),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bulk Import Scores"
        description="Migrate historical score data from a spreadsheet. Download the pre-filled template for a specific class/subject/term, fill in the scores, then upload it here."
      />
      <ScoresImportWizard sessions={sessions} classes={classes} subjects={subjects} />
    </div>
  );
}
