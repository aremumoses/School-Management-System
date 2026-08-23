'use client';

import { cn } from '@/lib/utils';

/** Same segmented-button design as components/dashboard/rating-control.tsx (design system §1's preferred pattern over a raw dropdown), generalized to a configurable top score instead of a fixed 1-5. */
export function RatingScale({
  value,
  max,
  onChange,
  disabled,
  ariaLabel,
}: {
  value: number | null;
  max: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  ariaLabel: string;
}) {
  const scale = Array.from({ length: max }, (_, i) => i + 1);

  return (
    <div role="radiogroup" aria-label={ariaLabel} className="flex flex-wrap gap-1">
      {scale.map((n) => {
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
