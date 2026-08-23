import { MessagingShell } from '@/components/communication/messaging-shell';
import { PageHeader } from '@/components/dashboard/page-header';
import { listConversations } from '@/lib/actions/communication';
import { apiFetch } from '@/lib/api';
import type { StudentListResponse } from '@/lib/types/students';

export default async function TeacherMessagesPage() {
  const [conversations, studentList] = await Promise.all([
    listConversations(),
    // Auto-scoped server-side to this teacher's own class(es)/subject(s) —
    // see students.service.ts's role-based scoping.
    apiFetch<StudentListResponse>('/students?pageSize=100'),
  ]);

  const studentOptions = studentList.data.map((s) => ({
    id: s.id,
    name: `${s.firstName} ${s.lastName} (${s.admissionNumber})`,
  }));

  return (
    <div className="space-y-6">
      <PageHeader title="Messages" description="Message a parent directly about their child." />
      <MessagingShell
        initialConversations={conversations}
        myType="STAFF"
        studentOptions={studentOptions}
      />
    </div>
  );
}
