import { PageHeader } from '@/components/dashboard/page-header';
import { listRoutes, listTransportStaffRecords } from '@/lib/actions/hostel-transport';
import { RoutesView } from './routes-view';

export default async function RoutesPage() {
  const [routes, staff] = await Promise.all([listRoutes(), listTransportStaffRecords()]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Routes & Stops"
        description="Define bus routes and their ordered stop list."
      />
      <RoutesView routes={routes} staff={staff} />
    </div>
  );
}
