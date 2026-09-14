import { ArrowLeft, CalendarClock, type LucideIcon, UserRound, Users } from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/components/dashboard/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { ClubDetailDto } from '@/lib/types/clubs';
import { ClubFormDialog } from '../club-form-dialog';
import { RosterManager } from './roster-manager';

/** A key fact beside a brand-coral icon circle, as on the profile hero. */
function Fact({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-coral text-brand-foreground">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="truncate text-sm font-semibold text-heading">{value}</dd>
      </div>
    </div>
  );
}

/** The club detail page's content, kept apart from its data fetching. */
export function ClubDetailView({
  club,
  staffOptions,
  studentOptions,
}: {
  club: ClubDetailDto;
  staffOptions: { id: string; name: string }[];
  studentOptions: { id: string; label: string }[];
}) {
  return (
    <div className="space-y-6">
      <PageHeader
        title={club.name}
        action={
          <>
            <ClubFormDialog staffOptions={staffOptions} club={club} />
            <Button variant="outline" render={<Link href="/admin/clubs" />}>
              <ArrowLeft className="size-4" aria-hidden="true" />
              All Clubs
            </Button>
          </>
        }
      />

      <section className="rounded-xl bg-card p-5 sm:p-6 dark:ring-1 dark:ring-foreground/10">
        <dl className="grid gap-4 sm:grid-cols-3">
          <Fact
            icon={UserRound}
            label="Patron"
            value={club.patron ? `${club.patron.firstName} ${club.patron.lastName}` : 'None assigned'}
          />
          <Fact icon={CalendarClock} label="Meets" value={club.meetingSchedule ?? 'No schedule set'} />
          <Fact icon={Users} label="Members" value={String(club.memberships.length)} />
        </dl>
        {club.description && (
          <p className="mt-5 border-t border-border pt-5 text-sm leading-relaxed whitespace-pre-wrap text-foreground">
            {club.description}
          </p>
        )}
      </section>

      <section className="overflow-hidden rounded-xl bg-card dark:ring-1 dark:ring-foreground/10">
        <div className="flex items-center gap-2 border-b border-border px-5 py-4 sm:px-6">
          <h2 className="text-lg font-semibold text-heading">Members</h2>
          <Badge variant="secondary">{club.memberships.length}</Badge>
        </div>
        <RosterManager
          clubId={club.id}
          memberships={club.memberships}
          studentOptions={studentOptions}
        />
      </section>
    </div>
  );
}
