import { auth } from '@/auth';
import { PageHeader } from '@/components/dashboard/page-header';
import { IncidentForm } from '@/components/discipline/incident-form';
import { IncidentList } from '@/components/discipline/incident-list';
import { listIncidents } from '@/lib/actions/discipline';
import { apiFetch } from '@/lib/api';
import { CAN_LOG_INCIDENT_ROLES, hasAnyRole } from '@/lib/discipline-roles';
import type { StudentListResponse } from '@/lib/types/students';

export default async function HostelDisciplinePage() {
  const session = await auth();
  const canLog = hasAnyRole(session!.user.roles, CAN_LOG_INCIDENT_ROLES);

  const [incidents, studentList] = await Promise.all([
    listIncidents(),
    apiFetch<StudentListResponse>('/students?pageSize=100&includeInactive=true'),
  ]);

  const studentNameById = new Map(
    studentList.data.map((s) => [s.id, `${s.firstName} ${s.lastName}`]),
  );

  const rows = incidents.map((incident) => ({
    incident,
    studentName: studentNameById.get(incident.studentId) ?? 'Unknown student',
  }));

  const activeStudents = studentList.data.filter((s) => s.isActive);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Discipline"
        description="Boarder-related incidents, proposed actions, and their approval status."
        action={
          canLog && (
            <IncidentForm
              students={activeStudents.map((s) => ({
                id: s.id,
                name: `${s.firstName} ${s.lastName} (${s.admissionNumber})`,
              }))}
            />
          )
        }
      />
      <IncidentList rows={rows} basePath="/hostel-transport/discipline" />
    </div>
  );
}
