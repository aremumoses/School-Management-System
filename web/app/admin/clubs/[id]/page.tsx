import { getClub } from '@/lib/actions/clubs';
import { apiFetch } from '@/lib/api';
import type { StaffDto } from '@/lib/types/staff';
import type { StudentListResponse } from '@/lib/types/students';
import { ClubDetailView } from './club-detail-view';

export default async function ClubDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [club, staff, studentsRes] = await Promise.all([
    getClub(id),
    apiFetch<StaffDto[]>('/staff'),
    // 100 is the API's actual @Max(100) cap on pageSize (QueryStudentsDto)
    // — this was requesting 500 and 400ing on every load, breaking this
    // whole page (pre-existing, unrelated to Stage 29).
    apiFetch<StudentListResponse>('/students?pageSize=100'),
  ]);

  const staffOptions = staff
    .filter((s) => s.isActive)
    .map((s) => ({ id: s.id, name: `${s.firstName} ${s.lastName}` }));
  const memberIds = new Set(club.memberships.map((m) => m.student.id));
  const studentOptions = studentsRes.data
    .filter((s) => !memberIds.has(s.id))
    .map((s) => ({
      id: s.id,
      label: `${s.firstName} ${s.lastName} (${s.admissionNumber})`,
    }));

  return <ClubDetailView club={club} staffOptions={staffOptions} studentOptions={studentOptions} />;
}
