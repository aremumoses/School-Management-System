import { MessagingShell } from '@/components/communication/messaging-shell';
import { PageHeader } from '@/components/dashboard/page-header';
import { listConversations, listMyTeachers } from '@/lib/actions/communication';

export default async function StudentMessagesPage() {
  const [conversations, teachers] = await Promise.all([
    listConversations(),
    listMyTeachers(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Messages"
        description="Direct conversations with your class and subject teachers."
      />
      <MessagingShell
        initialConversations={conversations}
        myType="STUDENT"
        teacherOptions={teachers}
      />
    </div>
  );
}
