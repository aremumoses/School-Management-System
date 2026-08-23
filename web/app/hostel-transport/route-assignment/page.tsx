import { PageHeader } from '@/components/dashboard/page-header';
import { listRouteAssignments, listRoutes } from '@/lib/actions/hostel-transport';
import { RouteAssignmentView } from './route-assignment-view';

export default async function RouteAssignmentPage() {
  const [assignments, routes] = await Promise.all([listRouteAssignments(), listRoutes()]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student-Route Assignment"
        description="Assign a student to a bus route and stop."
      />
      <RouteAssignmentView assignments={assignments} routes={routes} />
    </div>
  );
}
