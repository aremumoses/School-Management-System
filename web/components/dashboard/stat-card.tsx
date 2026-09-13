import { ArrowDownRight, ArrowRight, ArrowUpRight, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// Akademi's solid icon circle. Semantic variants carry a real pass/fail
// meaning (e.g. today's attendance rate) and fill the circle with that status
// colour; decorative variants are for plain counts ("Active students") and are
// visual variety only. The glyph is decorative either way — the label names
// the stat — which is why a white icon is acceptable even on amber.
const CIRCLE_CLASSES = {
  default: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  error: 'bg-destructive',
  info: 'bg-info',
  brand: 'bg-brand',
  coral: 'bg-brand-coral',
  amber: 'bg-brand-amber',
} as const;

type StatVariant = keyof typeof CIRCLE_CLASSES;

export interface StatDelta {
  /** Signed percentage change, e.g. 8.4 or -2.1. */
  percent: number;
  /** What it's being compared against — "vs last term". */
  comparedTo: string;
  /**
   * Whether a rise is good. Defaults to true; set false for stats where up
   * is bad (outstanding fees, absentees) so the colour matches the meaning
   * rather than the arrow direction.
   */
  higherIsBetter?: boolean;
}

/**
 * A single large-number stat — design system §6 ("Stat/KPI tiles"),
 * new-design §4.
 *
 * Beyond the number itself a tile can carry a period-on-period `delta` and
 * a `trend` sparkline. Both are optional and independent: a count with no
 * meaningful history (Pending Approvals) should show neither rather than
 * inventing a flat line, which is why nothing is defaulted here.
 *
 * Direction is never signalled by colour alone (§14): the arrow glyph and
 * the "vs last term" text both carry it, so the tint is reinforcement.
 */
export function StatCard({
  label,
  value,
  description,
  icon: Icon,
  variant = 'default',
  delta,
  trend,
  href,
}: {
  label: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  variant?: StatVariant;
  delta?: StatDelta;
  /** Oldest → newest. Needs 2+ points to render; fewer is treated as none. */
  trend?: number[];
  /** Makes the whole tile a link — §4 wants KPI cards to be a way in. */
  href?: string;
}) {
  // Poppins semibold figures run ~0.66em wide, so this is the value's width in ems.
  const valueEms = (String(value).length * 0.66).toFixed(2);

  const body = (
    <Card
      className={cn(
        '@container/stat h-full gap-0 rounded-xl py-0 ring-0 transition-all duration-[--duration-base] ease-[--ease-out-soft] dark:ring-1',
        href && 'group-hover/stat:-translate-y-0.5 group-hover/stat:shadow-md',
      )}
    >
      <div className="flex h-full flex-col gap-3 p-5">
        <div className="flex flex-col items-start gap-3 @[13rem]/stat:flex-row @[13rem]/stat:items-center @[13rem]/stat:gap-4">
          <span
            className={cn(
              'flex size-12 shrink-0 items-center justify-center rounded-full text-brand-foreground',
              CIRCLE_CLASSES[variant],
            )}
          >
            <Icon className="size-5" aria-hidden="true" />
          </span>
          <div className="w-full min-w-0 flex-1">
            {/* Wraps rather than truncates: in a two-column phone grid a
                label like "Lessons today" does not fit on one line, and half
                a word is worse than two lines. */}
            <p className="line-clamp-2 text-[13px] leading-snug text-muted-foreground">{label}</p>
            {/* The figure shrinks to the width it has (tile width minus padding,
                and minus the circle when it sits beside the text) rather than
                wrapping or clipping: a cut-off naira balance is wrong, not ugly. */}
            <p
              className="mt-1 leading-tight font-semibold tracking-tight whitespace-nowrap text-heading [--stat-reserve:2.5rem] @[13rem]/stat:[--stat-reserve:6.5rem]"
              style={{
                fontSize: `clamp(0.875rem, calc((100cqi - var(--stat-reserve)) / ${valueEms}), 1.625rem)`,
              }}
            >
              {value}
            </p>
          </div>
        </div>

        {(delta || description) && (
          <div className="min-w-0 space-y-0.5">
            {delta && <DeltaPill delta={delta} />}
            {description && (
              <p className="line-clamp-1 text-xs text-muted-foreground">{description}</p>
            )}
          </div>
        )}

        {/* Full-bleed strip rather than a chip beside the text: at four
            tiles across, a fixed-width sparkline and a description fight
            over ~140px and the description always loses. Spanning the tile
            also makes the shape readable, which is the only thing a
            sparkline is for. */}
        {trend && trend.length > 1 && (
          <Sparkline points={trend} className="-mb-1 mt-auto w-full text-primary" />
        )}
      </div>
    </Card>
  );

  if (!href) return body;

  return (
    <Link
      href={href}
      className="group/stat block rounded-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
    >
      {body}
    </Link>
  );
}

function DeltaPill({ delta }: { delta: StatDelta }) {
  const { percent, comparedTo, higherIsBetter = true } = delta;
  const flat = Math.abs(percent) < 0.05;
  const good = flat ? null : percent > 0 === higherIsBetter;
  const Arrow = flat ? ArrowRight : percent > 0 ? ArrowUpRight : ArrowDownRight;

  return (
    <p className="flex items-center gap-1 text-xs">
      <span
        className={cn(
          'inline-flex items-center gap-0.5 font-semibold tabular-nums',
          good === null
            ? 'text-muted-foreground'
            : good
              ? 'text-success-soft-foreground'
              : 'text-error-soft-foreground',
        )}
      >
        <Arrow className="size-3.5" aria-hidden="true" />
        {flat ? '0%' : `${Math.abs(percent).toFixed(1)}%`}
      </span>
      <span className="truncate text-muted-foreground">{comparedTo}</span>
    </p>
  );
}

/**
 * Bare trend line — no axes, no labels, no tooltip. A sparkline's whole job
 * is shape, and the exact figure is already the headline number two lines
 * above it, so anything more would be noise. Hidden from assistive tech for
 * the same reason: it carries no information the text doesn't.
 */
function Sparkline({ points, className }: { points: number[]; className?: string }) {
  // Fixed viewBox stretched by CSS (`preserveAspectRatio="none"`): the tile
  // width varies with the grid, and a stretched line is fine where a
  // stretched *label* would not be — there is no text in here.
  const width = 100;
  const height = 28;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const step = width / (points.length - 1);

  const coords = points.map((point, index) => {
    const x = index * step;
    // 2px inset top and bottom so the 2px stroke is never clipped.
    const y = height - 2 - ((point - min) / span) * (height - 4);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      height={height}
      fill="none"
      aria-hidden="true"
      className={className}
      focusable="false"
    >
      <polyline
        points={coords.join(' ')}
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        opacity={0.85}
      />
    </svg>
  );
}
