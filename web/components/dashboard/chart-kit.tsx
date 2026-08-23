'use client';

import type { ReactNode } from 'react';
import { ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';

/**
 * Shared chart furniture — design system §7.
 *
 * Every chart in the app reads its colours from CSS custom properties
 * rather than literals, which is what makes dark mode work: the tokens are
 * redefined under `.dark` in globals.css, so a chart re-renders in the right
 * palette with no `useTheme` call and no second colour table to maintain.
 *
 * The categorical series order is fixed (`SERIES`) and must not be cycled or
 * reordered per chart — that ordering is the colourblind-safety mechanism,
 * validated as a set against both surfaces. A chart needing a sixth series
 * should fold the tail into "Other" or split into small multiples.
 */

export const SERIES = [
  'var(--color-chart-1)',
  'var(--color-chart-2)',
  'var(--color-chart-3)',
  'var(--color-chart-4)',
  'var(--color-chart-5)',
] as const;

/** Semantic colours, reserved — never reused as "series 4". */
export const SEMANTIC = {
  positive: 'var(--color-success)',
  caution: 'var(--color-warning)',
  negative: 'var(--color-destructive)',
  neutral: 'var(--color-muted-foreground)',
} as const;

export const AXIS_TICK = {
  fontSize: 11,
  fill: 'var(--color-muted-foreground)',
} as const;

export const GRID_PROPS = {
  stroke: 'var(--color-border)',
  strokeDasharray: '3 3',
  vertical: false,
} as const;

export const TOOLTIP_PROPS = {
  cursor: { fill: 'var(--color-accent)', stroke: 'var(--color-border)' },
  contentStyle: {
    borderRadius: 'var(--radius)',
    border: '1px solid var(--color-border)',
    background: 'var(--color-popover)',
    color: 'var(--color-popover-foreground)',
    boxShadow: 'var(--shadow-md)',
    fontSize: 12,
    padding: '8px 10px',
  },
  labelStyle: { color: 'var(--color-foreground)', fontWeight: 600, marginBottom: 2 },
  itemStyle: { color: 'var(--color-muted-foreground)' },
} as const;

export const LEGEND_PROPS = {
  wrapperStyle: { fontSize: 12, paddingTop: 8, color: 'var(--color-muted-foreground)' },
  iconType: 'circle' as const,
  iconSize: 8,
};

/**
 * Card wrapper for a chart: title, optional subtitle and controls, a fixed
 * plot height, and — importantly — a slot for the "no data yet" case, so no
 * chart ever renders an empty axis frame with nothing in it.
 */
export function ChartCard({
  title,
  description,
  action,
  height = 260,
  isEmpty = false,
  emptyMessage = 'Not enough data to chart yet.',
  children,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  height?: number;
  isEmpty?: boolean;
  emptyMessage?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        'flex flex-col gap-4 rounded-2xl bg-card p-5 ring-1 ring-foreground/10',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base leading-snug font-semibold text-foreground">{title}</h2>
          {description && (
            <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>

      {isEmpty ? (
        <div
          className="flex items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground"
          style={{ height }}
        >
          {emptyMessage}
        </div>
      ) : (
        <div style={{ height }} className="w-full">
          <ResponsiveContainer width="100%" height="100%">
            {children as React.ReactElement}
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
