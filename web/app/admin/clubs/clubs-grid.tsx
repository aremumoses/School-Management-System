import { CalendarClock, Trophy, UserRound, Users } from 'lucide-react';
import Link from 'next/link';
import type { ClubDto } from '@/lib/types/clubs';

/** Akademi-style club cards — the whole card is the link to the club. */
export function ClubsGrid({ clubs }: { clubs: ClubDto[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {clubs.map((club) => {
        const members = club._count.memberships;
        return (
          <Link
            key={club.id}
            href={`/admin/clubs/${club.id}`}
            className="group rounded-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
          >
            <article className="flex h-full flex-col rounded-xl bg-card p-5 transition-all group-hover:-translate-y-0.5 group-hover:shadow-md dark:ring-1 dark:ring-foreground/10">
              <div className="flex items-start justify-between gap-3">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Trophy className="size-5" aria-hidden="true" />
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary dark:text-foreground">
                  <Users className="size-3.5" aria-hidden="true" />
                  {members} member{members === 1 ? '' : 's'}
                </span>
              </div>
              <h2 className="mt-4 text-lg leading-snug font-semibold text-heading group-hover:text-primary dark:group-hover:text-foreground">
                {club.name}
              </h2>
              {club.description && (
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{club.description}</p>
              )}
              <dl className="mt-auto space-y-2 border-t border-border pt-4 text-sm [&:not(:first-child)]:mt-4">
                <div>
                  <dt className="sr-only">Patron</dt>
                  <dd className="flex min-w-0 items-center gap-2 text-foreground">
                    <UserRound className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <span className="truncate">
                      {club.patron
                        ? `Patron: ${club.patron.firstName} ${club.patron.lastName}`
                        : 'Patron: None assigned'}
                    </span>
                  </dd>
                </div>
                {club.meetingSchedule && (
                  <div>
                    <dt className="sr-only">Meets</dt>
                    <dd className="flex min-w-0 items-center gap-2 text-foreground">
                      <CalendarClock className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      <span className="truncate">{club.meetingSchedule}</span>
                    </dd>
                  </div>
                )}
              </dl>
            </article>
          </Link>
        );
      })}
    </div>
  );
}
