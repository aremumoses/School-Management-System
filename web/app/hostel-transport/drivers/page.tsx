import { PageHeader } from '@/components/dashboard/page-header';
import { listTransportStaffRecords } from '@/lib/actions/hostel-transport';
import { DriversView } from './drivers-view';

export default async function DriversPage() {
  const staff = await listTransportStaffRecords();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Driver & Conductor Records"
        description="Staff/contractor directory with license and verification details."
      />
      <DriversView staff={staff} />
    </div>
  );
}
