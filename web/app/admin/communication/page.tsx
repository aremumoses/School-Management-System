import { BroadcastComposer } from '@/components/communication/broadcast-composer';
import { NoticeManager } from '@/components/communication/notice-manager';
import { TemplateManager } from '@/components/communication/template-manager';
import { PageHeader } from '@/components/dashboard/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { listMessageTemplates, listNotices } from '@/lib/actions/communication';
import { apiFetch } from '@/lib/api';
import type { ClassDto } from '@/lib/types/academic';
import type { StaffDto } from '@/lib/types/staff';
import type { StudentListResponse } from '@/lib/types/students';

export default async function AdminCommunicationPage() {
  const [classes, staff, studentList, templates, notices] = await Promise.all([
    apiFetch<ClassDto[]>('/classes'),
    apiFetch<StaffDto[]>('/staff'),
    apiFetch<StudentListResponse>('/students?pageSize=100'),
    listMessageTemplates(),
    listNotices(),
  ]);

  const staffOptions = staff.map((s) => ({ id: s.id, name: `${s.firstName} ${s.lastName}` }));
  const studentOptions = studentList.data.map((s) => ({
    id: s.id,
    name: `${s.firstName} ${s.lastName} (${s.admissionNumber})`,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Communication"
        description="Broadcast announcements, manage the notice board, and customize message templates."
      />

      <Tabs defaultValue="broadcast">
        <div className="overflow-x-auto">
          <TabsList className="w-full sm:w-fit">
            <TabsTrigger value="broadcast">Broadcast</TabsTrigger>
            <TabsTrigger value="notices">Notices</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="broadcast">
          <BroadcastComposer
            allowedTargetTypes={['CLASS', 'ROLE', 'INDIVIDUAL', 'WHOLE_SCHOOL']}
            classes={classes}
            staffOptions={staffOptions}
            studentOptions={studentOptions}
            templates={templates}
          />
        </TabsContent>
        <TabsContent value="notices">
          <NoticeManager notices={notices} />
        </TabsContent>
        <TabsContent value="templates">
          <TemplateManager templates={templates} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
