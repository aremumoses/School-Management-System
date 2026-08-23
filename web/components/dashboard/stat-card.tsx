import { ArrowDownRight, ArrowRight, ArrowUpRight, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// Semantic variants (a stat that carries a real pass/fail meaning, e.g.
// today's attendance rate) — tint only the icon swatch, card stays neutral
// `surface`, so the color reads as a status signal rather than decoration.
const SEMANTIC_ICON_CLASSES = {
  default: 'bg-primary/10 text-primary',
  success: 'bg-success-soft text-success-soft-foreground',
  warning: 'bg-warning-soft text-warning-soft-foreground',
  error: 'bg-error-soft text-error-soft-foreground',
  info: 'bg-info-soft text-info-soft-foreground',
} as const;

// Decorative variants — a purely informational count with no pass/fail
// meaning (e.g. "Active Students"). Tints the whole card per
// prompts/00-DESIGN-SYSTEM.md §6's "Stat/KPI tiles" note; cycle these across
// a row of otherwise-neutral counts for visual variety, don't use them for
// anything a badge/semantic variant already covers.
const TINT_CARD_CLASSES = {
  violet: 'bg-stat-violet',
  blue: 'bg-stat-blue',
  orange: 'bg-stat-orange',
  emerald: 'bg-stat-emerald',
} as const;
const TINT_ICON_CLASSES = {
  violet: 'bg-card/70 text-stat-violet-foreground',
  blue: 'bg-card/70 text-stat-blue-foreground',
  orange: 'bg-card/70 text-stat-orange-foreground',
  emerald: 'bg-card/70 text-stat-emerald-foreground',
} as const;
const TINT_SPARK_CLASSES = {
  violet: 'text-stat-violet-foreground',
  blue: 'text-stat-blue-foreground',
  orange: 'text-stat-orange-foreground',
  emerald: 'text-stat-emerald-foreground',
} as const;

type SemanticVariant = keyof typeof SEMANTIC_ICON_CLASSES;
type TintVariant = keyof typeof TINT_CARD_CLASSES;

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
  variant?: SemanticVariant | TintVariant;
  delta?: StatDelta;
  /** Oldest → newest. Needs 2+ points to render; fewer is treated as none. */
  trend?: number[];
  /** Makes the whole tile a link — §4 wants KPI cards to be a way in. */
  href?: string;
}) {
  const isTint = variant in TINT_CARD_CLASSES;
  const iconClasses = isTint
    ? TINT_ICON_CLASSES[variant as TintVariant]
    : SEMANTIC_ICON_CLASSES[variant as SemanticVariant];

  const body = (
    <Card
      className={cn(
        'h-full rounded-2xl transition-all duration-[--duration-base] ease-[--ease-out-soft]',
        isTint && TINT_CARD_CLASSES[variant as TintVariant],
        href && 'group-hover/stat:-translate-y-0.5 group-hover/stat:shadow-md',
      )}
    >
      <CardContent className="flex flex-col gap-3 py-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {/* Wraps rather than truncates: in a two-column phone grid a
                label like "Lessons today" does not fit on one line beside
                the icon, and half a word is worse than two lines. */}
            <p className="line-clamp-2 text-[13px] leading-snug font-medium text-muted-foreground">
              {label}
            </p>
            <p
              className={cn(
                'mt-1 leading-none font-bold tracking-tight text-foreground tabular-nums',
                valueSizeClass(value),
              )}
            >
              {value}
            </p>
          </div>
          <div
            className={cn(
              'flex size-10 shrink-0 items-center justify-center rounded-xl',
              iconClasses,
            )}
          >
            <Icon className="size-[18px]" aria-hidden="true" />
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
          <Sparkline
            points={trend}
            className={cn(
              '-mb-1 w-full',
              isTint ? TINT_SPARK_CLASSES[variant as TintVariant] : 'text-primary',
            )}
          />
        )}
      </CardContent>
    </Card>
  );

  if (!href) return body;

  return (
    <Link
      href={href}
      className="group/stat block rounded-2xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
    >
      {body}
    </Link>
  );
}

/**
 * Step the headline down as it gets longer. A count ("23") and a formatted
 * currency balance ("\u20a61,284,500.00") are both legitimate `value`s, and at a
 * fixed 26px the second one overflows its tile in a two-column phone grid.
 * Scaling beats truncating: a clipped money figure is not just ugly, it is
 * wrong.
 */
function valueSizeClass(value: string | number): string {
  const length = String(value).length;
  // Only the small end steps down: a four-across desktop tile is ~270px and
  // fits a full naira figure at 26px comfortably, so the reduction is scoped
  // below `sm` where the grid is two-up and ~170px per tile.
  if (length <= 6) return 'text-[26px]';
  if (length <= 9) return 'text-[22px] sm:text-[26px]';
  if (length <= 12) return 'text-lg sm:text-2xl';
  return 'text-base sm:text-xl';
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
