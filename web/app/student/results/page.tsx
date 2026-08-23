import { auth } from '@/auth';
import { PageHeader } from '@/components/dashboard/page-header';
import { ReportCardView } from '@/components/results/report-card-view';

export default async function StudentResultsPage() {
  const session = await auth();
  const studentId = session!.user.id;

  return (
    <div className="space-y-6">
      <PageHeader title="Scores & Report Cards" description="Your results and performance trend." />
      <ReportCardView studentId={studentId} />
    </div>
  );
}
