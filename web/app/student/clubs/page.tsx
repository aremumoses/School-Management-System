import { CalendarClock, Trophy, UserRound } from 'lucide-react';
import { auth } from '@/auth';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card, CardContent } from '@/components/ui/card';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { listMyClubs } from '@/lib/actions/clubs';

export default async function StudentClubsPage() {
  const session = await auth();
  const clubs = await listMyClubs(session!.user.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clubs & Activities"
        description="The clubs, societies, and teams you belong to."
      />

      {clubs.length === 0 ? (
        <Empty className="border border-dashed border-border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Trophy />
            </EmptyMedia>
            <EmptyTitle>No clubs yet</EmptyTitle>
            <EmptyDescription>
              You haven&apos;t been enrolled in any club — speak to the school office if you&apos;d
              like to join one.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="space-y-3">
          {clubs.map((club) => (
            <Card key={club.membershipId}>
              <CardContent className="space-y-2 py-4">
                <p className="font-semibold text-foreground">{club.name}</p>
                {club.description && (
                  <p className="text-sm text-muted-foreground">{club.description}</p>
                )}
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p className="flex items-center gap-1.5">
                    <UserRound className="size-3.5" aria-hidden="true" />
                    Patron:{' '}
                    {club.patron
                      ? `${club.patron.firstName} ${club.patron.lastName}`
                      : 'None assigned'}
                  </p>
                  {club.meetingSchedule && (
                    <p className="flex items-center gap-1.5">
                      <CalendarClock className="size-3.5" aria-hidden="true" />
                      {club.meetingSchedule}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
