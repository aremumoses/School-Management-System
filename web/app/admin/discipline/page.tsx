import { auth } from '@/auth';
import { PageHeader } from '@/components/dashboard/page-header';
import { IncidentForm } from '@/components/discipline/incident-form';
import { IncidentList } from '@/components/discipline/incident-list';
import { listIncidents } from '@/lib/actions/discipline';
import { apiFetch } from '@/lib/api';
import { CAN_LOG_INCIDENT_ROLES, hasAnyRole } from '@/lib/discipline-roles';
import type { StudentListResponse } from '@/lib/types/students';

export default async function AdminDisciplinePage() {
  const session = await auth();
  const canLog = hasAnyRole(session!.user.roles, CAN_LOG_INCIDENT_ROLES);

  // includeInactive=true for name lookups — Incident is an append-only,
  // audit-significant record (never hard-deleted), so a case logged
  // against a student who later withdrew/graduated must still resolve a
  // real name here instead of falling back to "Unknown student".
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

  // The "Log Incident" picker itself stays active-students-only, though —
  // logging a *new* case against someone no longer enrolled isn't a real
  // workflow, unlike looking up one logged while they were still here.
  const activeStudents = studentList.data.filter((s) => s.isActive);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Discipline"
        description="Logged incidents, proposed actions, and the Admin approval queue for Suspension/Expulsion."
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
      <IncidentList rows={rows} basePath="/admin/discipline" />
    </div>
  );
}
