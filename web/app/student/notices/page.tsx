import { NoticeBoard } from '@/components/communication/notice-board';
import { PageHeader } from '@/components/dashboard/page-header';
import { listNotices } from '@/lib/actions/communication';

export default async function StudentNoticesPage() {
  const notices = await listNotices();
  return (
    <div className="space-y-6">
      <PageHeader title="Notices" description="School-wide announcements and events." />
      <NoticeBoard notices={notices} />
    </div>
  );
}
