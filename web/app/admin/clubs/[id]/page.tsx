import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/components/dashboard/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getClub } from '@/lib/actions/clubs';
import { apiFetch } from '@/lib/api';
import type { StaffDto } from '@/lib/types/staff';
import type { StudentListResponse } from '@/lib/types/students';
import { ClubFormDialog } from '../club-form-dialog';
import { RosterManager } from './roster-manager';

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

  return (
    <div className="space-y-6">
      <PageHeader
        title={club.name}
        description={[
          club.patron ? `Patron: ${club.patron.firstName} ${club.patron.lastName}` : null,
          club.meetingSchedule,
        ]
          .filter(Boolean)
          .join(' · ')}
        action={
          <div className="flex items-center gap-2">
            <ClubFormDialog staffOptions={staffOptions} club={club} />
            <Button variant="ghost" size="sm" render={<Link href="/admin/clubs" />}>
              <ArrowLeft className="size-4" aria-hidden="true" />
              All Clubs
            </Button>
          </div>
        }
      />

      {club.description && (
        <p className="text-sm text-muted-foreground">{club.description}</p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Members ({club.memberships.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <RosterManager
            clubId={club.id}
            memberships={club.memberships}
            studentOptions={studentOptions}
          />
        </CardContent>
      </Card>
    </div>
  );
}
