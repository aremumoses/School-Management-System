'use client';

import { cn } from '@/lib/utils';

const SCALE = [1, 2, 3, 4, 5];

/** A clean segmented 1-5 rating control — design system §1 calls for this instead of a raw dropdown for affective/psychomotor ratings. */
export function RatingControl({
  value,
  onChange,
  disabled,
  ariaLabel,
}: {
  value: number | null;
  onChange: (value: number) => void;
  disabled?: boolean;
  ariaLabel: string;
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="flex gap-1">
      {SCALE.map((n) => {
        const isActive = value === n;
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={isActive}
            aria-label={`${ariaLabel}: ${n}`}
            disabled={disabled}
            onClick={() => onChange(n)}
            className={cn(
              'flex size-8 items-center justify-center rounded-md border text-sm font-semibold tabular-nums transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60',
              isActive
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-input bg-transparent text-muted-foreground hover:bg-muted',
            )}
          >
            {n}
          </button>
        );
      })}
    </div>
  );
}
