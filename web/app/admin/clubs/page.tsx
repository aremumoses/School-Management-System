import { Users } from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/components/dashboard/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { listClubs } from '@/lib/actions/clubs';
import { apiFetch } from '@/lib/api';
import type { StaffDto } from '@/lib/types/staff';
import { ClubFormDialog } from './club-form-dialog';

export default async function AdminClubsPage() {
  const [clubs, staff] = await Promise.all([
    listClubs(),
    apiFetch<StaffDto[]>('/staff'),
  ]);
  const staffOptions = staff
    .filter((s) => s.isActive)
    .map((s) => ({ id: s.id, name: `${s.firstName} ${s.lastName}` }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clubs & Activities"
        description="Societies, clubs, and sports teams — each with a patron teacher and a member roster."
        action={<ClubFormDialog staffOptions={staffOptions} />}
      />

      {clubs.length === 0 ? (
        <Empty className="border border-dashed border-border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Users />
            </EmptyMedia>
            <EmptyTitle>No clubs yet</EmptyTitle>
            <EmptyDescription>Create the school&apos;s first club to get started.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <ClubFormDialog staffOptions={staffOptions} />
          </EmptyContent>
        </Empty>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clubs.map((club) => (
            <Link key={club.id} href={`/admin/clubs/${club.id}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardContent className="space-y-2 py-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-foreground">{club.name}</p>
                    <Badge variant="outline">
                      {club._count.memberships} member
                      {club._count.memberships === 1 ? '' : 's'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Patron:{' '}
                    {club.patron
                      ? `${club.patron.firstName} ${club.patron.lastName}`
                      : 'None assigned'}
                  </p>
                  {club.meetingSchedule && (
                    <p className="text-xs text-muted-foreground">{club.meetingSchedule}</p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
