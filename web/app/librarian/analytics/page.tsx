import { PageHeader } from '@/components/dashboard/page-header';
import { getLibraryAnalytics } from '@/lib/actions/library';
import { AnalyticsView } from './analytics-view';

export default async function LibraryAnalyticsPage() {
  const analytics = await getLibraryAnalytics();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Library Analytics"
        description="Most-borrowed titles, busiest periods, overdue rate, and category-level usage."
      />
      <AnalyticsView analytics={analytics} />
    </div>
  );
}
