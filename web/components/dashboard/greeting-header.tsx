import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * The dashboard's opening line — new-design §4.
 *
 * A dashboard header is not a page title: it should orient the reader in
 * *time* before it shows them a number. Which session, which term, what
 * today's date is — every figure below is meaningless without that context,
 * and admins routinely have last term's data open in another tab.
 *
 * The greeting is computed server-side from the request's clock. That is the
 * school's own timezone on this deployment (single school, one location), so
 * a client-side pass to "correct" it would only add a hydration flash.
 */
export function GreetingHeader({
  name,
  schoolName,
  session,
  term,
  today,
  actions,
}: {
  name: string;
  schoolName?: string;
  session?: string;
  term?: string;
  today: Date;
  actions?: ReactNode;
}) {
  const firstName = name.split(' ')[0] || name;
  const context = [schoolName, session, term].filter(Boolean) as string[];

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {greeting(today)}, {firstName}{' '}
          <span aria-hidden="true" className="inline-block">
            👋
          </span>
        </h1>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
          {context.map((entry, index) => (
            <span key={entry} className="flex items-center gap-2">
              {index > 0 && (
                <span aria-hidden="true" className="size-1 rounded-full bg-border" />
              )}
              <span className={cn(index === 0 && 'font-medium text-foreground')}>{entry}</span>
            </span>
          ))}
          {context.length > 0 && <span aria-hidden="true" className="size-1 rounded-full bg-border" />}
          <time dateTime={today.toISOString().slice(0, 10)}>{formatLongDate(today)}</time>
        </div>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

function greeting(now: Date): string {
  const hour = now.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatLongDate(date: Date): string {
  return date.toLocaleDateString('en-NG', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
