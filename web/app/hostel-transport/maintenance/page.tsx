import { PageHeader } from '@/components/dashboard/page-header';
import { getMaintenanceDueSoon, listMaintenanceRecords } from '@/lib/actions/hostel-transport';
import { MaintenanceView } from './maintenance-view';

export default async function MaintenancePage() {
  const [records, dueSoon] = await Promise.all([
    listMaintenanceRecords(),
    getMaintenanceDueSoon(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vehicle Maintenance"
        description="Service history and due-for-service alerts."
      />
      <MaintenanceView records={records} dueSoon={dueSoon} />
    </div>
  );
}
