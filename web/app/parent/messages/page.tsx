import { MessagingShell } from '@/components/communication/messaging-shell';
import { PageHeader } from '@/components/dashboard/page-header';
import { listConversations } from '@/lib/actions/communication';

export default async function ParentMessagesPage() {
  const conversations = await listConversations();

  return (
    <div className="space-y-6">
      <PageHeader title="Messages" description="Conversations with your child's teachers." />
      <MessagingShell initialConversations={conversations} myType="GUARDIAN" />
    </div>
  );
}
