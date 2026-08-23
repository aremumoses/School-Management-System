import { auth } from '@/auth';
import { PageHeader } from '@/components/dashboard/page-header';
import { getMyTeachingAssignments } from '@/lib/actions/attendance';
import { listResources } from '@/lib/actions/resources';
import { ResourcesList } from './resources-list';
import { UploadResourceDialog } from './upload-resource-dialog';

export default async function TeacherResourcesPage() {
  const session = await auth();
  const userId = session!.user.id;

  const [resources, assignments] = await Promise.all([
    listResources({}),
    getMyTeachingAssignments(userId),
  ]);

  // One option per class/subject pair the teacher currently teaches — a
  // resource is shared class-wide (every arm at the level).
  const seen = new Set<string>();
  const options = assignments
    .filter((a) => a.term.isCurrent)
    .filter((a) => {
      const key = `${a.classSubject.classId}:${a.classSubject.subjectId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((a) => ({
      classId: a.classSubject.classId,
      subjectId: a.classSubject.subjectId,
      label: `${a.classSubject.class.name} — ${a.classSubject.subject.name}`,
    }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Resources"
        description="Notes, slides, past questions, and video links you've shared. A resource is visible to every arm of the class you pick."
        action={options.length > 0 ? <UploadResourceDialog options={options} /> : undefined}
      />
      <ResourcesList resources={resources} />
    </div>
  );
}
