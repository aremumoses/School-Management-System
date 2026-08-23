import { PageHeader } from '@/components/dashboard/page-header';
import { listVisitations } from '@/lib/actions/hostel-transport';
import { VisitationView } from './visitation-view';

export default async function VisitationPage() {
  const visitations = await listVisitations();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Visitation Log"
        description="Record who visited a boarder, when, and their relationship."
      />
      <VisitationView visitations={visitations} />
    </div>
  );
}
