import { Briefcase } from 'lucide-react';
import { PageHeader } from '@/components/dashboard/page-header';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { listVacancies } from '@/lib/actions/hr';
import { NewVacancyDialog } from './new-vacancy-dialog';
import { VacancyList } from './vacancy-list';

export default async function RecruitmentPage() {
  const vacancies = await listVacancies();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recruitment Pipeline"
        description="Post vacancies, track applicants through the pipeline, and convert a hired candidate into a staff login."
        action={<NewVacancyDialog />}
      />

      {vacancies.length === 0 ? (
        <Empty className="border border-dashed border-border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Briefcase />
            </EmptyMedia>
            <EmptyTitle>No vacancies posted yet</EmptyTitle>
            <EmptyDescription>Post your first vacancy above.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <VacancyList vacancies={vacancies} />
      )}
    </div>
  );
}
