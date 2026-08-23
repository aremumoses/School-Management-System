'use client';

import { RefreshCw, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * The one error state for the whole app (new-design §35).
 *
 * Deliberately says what the user lost and what to do next, never what the
 * stack trace said — "We couldn't load the student records" is actionable;
 * a 502 is not. `detail` exists for the rare case where the API returns a
 * message a school administrator can actually act on (a permission
 * explanation, a validation summary); never pass a raw exception into it.
 */
export function ErrorState({
  title = 'Something went wrong',
  description = "We couldn't load this just now. Please try again.",
  detail,
  onRetry,
  className,
  compact = false,
}: {
  title?: string;
  description?: string;
  detail?: string;
  /** Omit for server-rendered failures with nothing to retry client-side. */
  onRetry?: () => void;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-dashed border-destructive/30 bg-error-soft/30 text-center',
        compact ? 'gap-2 px-6 py-10' : 'gap-3 px-6 py-16',
        className,
      )}
    >
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-error-soft text-error-soft-foreground',
          compact ? 'size-10' : 'size-14',
        )}
      >
        <TriangleAlert className={compact ? 'size-4.5' : 'size-6'} aria-hidden="true" />
      </div>
      <div className="space-y-1">
        <p className={cn('font-semibold text-foreground', compact ? 'text-sm' : 'text-base')}>
          {title}
        </p>
        <p className="mx-auto max-w-sm text-sm text-balance text-muted-foreground">{description}</p>
        {detail && <p className="mx-auto max-w-sm text-xs text-muted-foreground/80">{detail}</p>}
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-2">
          <RefreshCw className="size-3.5" />
          Try again
        </Button>
      )}
    </div>
  );
}
