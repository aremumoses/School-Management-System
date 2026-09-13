import type { LucideIcon } from 'lucide-react';
import Image from 'next/image';
import type { ReactNode } from 'react';

export interface ProfileDetail {
  icon: LucideIcon;
  label: string;
  value: string;
}

/**
 * Akademi's profile hero, shared by the student and staff profiles: a brand
 * banner with decorative coral and amber blocks, the photo (or initials)
 * overlapping it, the name as the page's H1, and key details beside coral
 * icon circles.
 */
export function ProfileHero({
  name,
  role,
  meta = [],
  photoUrl,
  initials,
  badge,
  details,
}: {
  name: string;
  /** Short role line under the name, in the brand colour ("Student", "Bursar"). */
  role: string;
  /** Further facts after the role, separated by dots. */
  meta?: string[];
  photoUrl?: string | null;
  initials: string;
  /** Shown beside the name, e.g. an "Inactive" badge. */
  badge?: ReactNode;
  details: ProfileDetail[];
}) {
  return (
    <section className="overflow-hidden rounded-xl bg-card dark:ring-1 dark:ring-foreground/10">
      <div aria-hidden="true" className="relative h-28 overflow-hidden bg-brand sm:h-36">
        <div className="absolute right-72 -bottom-3 hidden h-20 w-28 rounded-t-3xl bg-brand-coral sm:block" />
        <div className="absolute right-6 -bottom-3 h-20 w-40 rounded-t-3xl bg-brand-amber sm:right-10 sm:h-28 sm:w-64" />
      </div>

      <div className="px-5 pb-6 sm:px-8">
        {/* bg-card under the tint: the circle straddles the banner, and a bare
            translucent tint would let the blue show through the initials. */}
        <div className="relative -mt-14 size-28 overflow-hidden rounded-full bg-card ring-8 ring-card sm:-mt-16 sm:size-32">
          {photoUrl ? (
            <Image src={photoUrl} alt={`Photo of ${name}`} fill className="object-cover" unoptimized />
          ) : (
            <span className="flex size-full items-center justify-center bg-primary/10 text-3xl font-semibold text-primary dark:text-heading">
              {initials}
            </span>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-heading sm:text-3xl">{name}</h1>
          {badge}
        </div>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <span className="font-semibold text-primary dark:text-foreground">{role}</span>
          {meta.map((entry, index) => (
            <span key={`${index}-${entry}`} className="flex items-center gap-2">
              <span aria-hidden="true" className="size-1 rounded-full bg-muted-foreground/40" />
              <span className="text-muted-foreground">{entry}</span>
            </span>
          ))}
        </p>

        <ul className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {details.map((detail) => (
            <li key={detail.label} className="flex min-w-0 items-center gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-coral text-brand-foreground">
                <detail.icon className="size-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{detail.label}</p>
                <p className="truncate text-sm font-semibold text-heading" title={detail.value}>
                  {detail.value}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
