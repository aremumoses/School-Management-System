import { PageHeader } from '@/components/dashboard/page-header';
import { listHostels } from '@/lib/actions/hostel-transport';
import { RoomsView } from './rooms-view';

export default async function RoomsPage() {
  const hostels = await listHostels();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Room & Bed Allocation"
        description="Pick a hostel and room, then click a vacant bed to assign a boarder."
      />
      <RoomsView hostels={hostels} />
    </div>
  );
}
