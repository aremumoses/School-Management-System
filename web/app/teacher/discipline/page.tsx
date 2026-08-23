import { auth } from '@/auth';
import { PageHeader } from '@/components/dashboard/page-header';
import { IncidentForm } from '@/components/discipline/incident-form';
import { IncidentList } from '@/components/discipline/incident-list';
import { getMyTeachingAssignments } from '@/lib/actions/attendance';
import { listIncidents } from '@/lib/actions/discipline';
import { apiFetch } from '@/lib/api';
import { CAN_LOG_INCIDENT_ROLES, hasAnyRole } from '@/lib/discipline-roles';
import type { ClassDto } from '@/lib/types/academic';
import type { StudentListResponse } from '@/lib/types/students';

export default async function TeacherDisciplinePage() {
  const session = await auth();
  const userId = session!.user.id;
  const roles = session!.user.roles;
  const isUnscoped = roles.some((r) => ['ADMIN', 'VICE_PRINCIPAL', 'HOD'].includes(r));
  const canLog = hasAnyRole(roles, CAN_LOG_INCIDENT_ROLES);

  const [incidents, classes, assignments] = await Promise.all([
    listIncidents(),
    apiFetch<ClassDto[]>('/classes'),
    getMyTeachingAssignments(userId),
  ]);

  // Own-class scope, mirroring app/teacher/attendance/page.tsx: every arm
  // this teacher is the Class Teacher of, plus every arm they currently
  // teach a subject in. Unscoped roles (Admin/VP/HOD visiting this screen)
  // get the full roster instead, matching the backend's own scoping rule.
  const ownArmIds = new Set<string>();
  for (const klass of classes) {
    for (const arm of klass.arms) {
      if (arm.classTeacher?.id === userId) ownArmIds.add(arm.id);
    }
  }
  for (const assignment of assignments.filter((a) => a.term.isCurrent)) {
    const klass = classes.find((c) => c.id === assignment.classSubject.classId);
    klass?.arms.forEach((arm) => ownArmIds.add(arm.id));
  }

  type StudentLookup = { id: string; firstName: string; lastName: string; admissionNumber: string };
  let lookupStudents: StudentLookup[] = [];
  let pickerStudents: StudentLookup[] = [];
  if (isUnscoped) {
    // includeInactive=true for name lookups, same reasoning as the Admin
    // discipline page — an incident logged before a student
    // withdrew/graduated must still resolve a name here. The "Log
    // Incident" picker itself stays active-only.
    const studentList = await apiFetch<StudentListResponse>(
      '/students?pageSize=100&includeInactive=true',
    );
    lookupStudents = studentList.data;
    pickerStudents = studentList.data.filter((s) => s.isActive);
  } else if (ownArmIds.size > 0) {
    // Arm rosters are implicitly active-enrollment-only, and the backend
    // already drops an incident from this scoped view entirely once its
    // student's enrollment in one of these arms stops being ACTIVE — so
    // there's no "withdrawn student, stale incident" case to handle here.
    const rosters = await Promise.all(
      [...ownArmIds].map((armId) =>
        apiFetch<StudentListResponse>(`/students?armId=${armId}&pageSize=100`),
      ),
    );
    const byId = new Map(rosters.flatMap((r) => r.data).map((s) => [s.id, s]));
    lookupStudents = [...byId.values()];
    pickerStudents = lookupStudents;
  }

  const studentNameById = new Map(lookupStudents.map((s) => [s.id, `${s.firstName} ${s.lastName}`]));
  const rows = incidents.map((incident) => ({
    incident,
    studentName: studentNameById.get(incident.studentId) ?? 'Unknown student',
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Discipline"
        description="Log incidents for your students and track proposed disciplinary actions."
        action={
          canLog &&
          pickerStudents.length > 0 && (
            <IncidentForm
              students={pickerStudents.map((s) => ({
                id: s.id,
                name: `${s.firstName} ${s.lastName} (${s.admissionNumber})`,
              }))}
            />
          )
        }
      />
      <IncidentList rows={rows} basePath="/teacher/discipline" />
    </div>
  );
}
