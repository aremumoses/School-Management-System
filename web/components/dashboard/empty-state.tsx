import type { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * The one empty state for the whole app (design system §10, new-design §33).
 *
 * Every empty state answers the same three questions in the same order:
 * what would normally be here, why it isn't, and the single next action. The
 * shape is fixed so a user who has learned one recognises all of them —
 * which is the actual point of a design system, more than the styling is.
 *
 * `title` should name the missing thing ("No students yet"), not the
 * failure ("Nothing found"); `description` should say what to do about it.
 */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  secondaryAction,
  className,
  compact = false,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  /** The single primary next step — a Button or Link-rendered Button. */
  action?: ReactNode;
  secondaryAction?: ReactNode;
  className?: string;
  /** For empty states inside a card/table rather than a whole page. */
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/40 text-center',
        compact ? 'gap-2 px-6 py-10' : 'gap-3 px-6 py-16',
        className,
      )}
    >
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-muted text-muted-foreground',
          compact ? 'size-10' : 'size-14',
        )}
      >
        <Icon className={compact ? 'size-4.5' : 'size-6'} aria-hidden="true" />
      </div>
      <div className="space-y-1">
        <p className={cn('font-semibold text-foreground', compact ? 'text-sm' : 'text-base')}>
          {title}
        </p>
        {description && (
          <p className="mx-auto max-w-sm text-sm text-balance text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {(action || secondaryAction) && (
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}
