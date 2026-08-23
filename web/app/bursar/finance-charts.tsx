'use client';

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AXIS_TICK,
  ChartCard,
  GRID_PROPS,
  LEGEND_PROPS,
  SERIES,
  TOOLTIP_PROPS,
} from '@/components/dashboard/chart-kit';
import { formatNaira } from '@/lib/format';

/** ₦1.2m / ₦840k — full precision belongs in the tooltip, not the axis. */
export function compactNaira(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `₦${(value / 1_000_000).toFixed(1)}m`;
  if (Math.abs(value) >= 1_000) return `₦${Math.round(value / 1_000)}k`;
  return `₦${value}`;
}

/** Collection rate term over term. One series — the title names it. */
export function CollectionRatePanel({
  points,
}: {
  points: { label: string; rate: number }[];
}) {
  return (
    <ChartCard
      title="Collection rate"
      description="Share of invoiced fees actually collected, term on term"
      isEmpty={points.length < 2}
      emptyMessage="A trend needs at least two terms of invoices."
    >
      <AreaChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
        <defs>
          <linearGradient id="collectionFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={SERIES[0]} stopOpacity={0.22} />
            <stop offset="100%" stopColor={SERIES[0]} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid {...GRID_PROPS} />
        <XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} />
        <YAxis
          domain={[0, 100]}
          tick={AXIS_TICK}
          axisLine={false}
          tickLine={false}
          width={48}
          tickFormatter={(value: number) => `${value}%`}
        />
        <Tooltip
          {...TOOLTIP_PROPS}
          formatter={(value) => [`${Number(value).toFixed(1)}%`, 'Collected']}
        />
        <Area
          type="monotone"
          dataKey="rate"
          stroke={SERIES[0]}
          strokeWidth={2}
          fill="url(#collectionFill)"
          dot={{ r: 3, strokeWidth: 0, fill: SERIES[0] }}
          activeDot={{ r: 5 }}
        />
      </AreaChart>
    </ChartCard>
  );
}

/**
 * What each class owes against what it has paid. Stacked because the pair
 * sums to a real quantity — the class's total invoice — which grouped bars
 * would obscure.
 */
export function OutstandingByClassPanel({
  rows,
}: {
  rows: { className: string; collected: number; outstanding: number }[];
}) {
  return (
    <ChartCard
      title="Collection by class"
      description="Current term — paid against still outstanding"
      isEmpty={rows.length === 0}
      emptyMessage="Figures appear once this term's invoices are raised."
    >
      <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 4 }}>
        <CartesianGrid {...GRID_PROPS} />
        <XAxis dataKey="className" tick={AXIS_TICK} axisLine={false} tickLine={false} interval={0} />
        <YAxis
          tick={AXIS_TICK}
          axisLine={false}
          tickLine={false}
          width={64}
          tickFormatter={compactNaira}
        />
        <Tooltip
          {...TOOLTIP_PROPS}
          formatter={(value, name) => [formatNaira(Number(value)), String(name)]}
        />
        <Legend {...LEGEND_PROPS} />
        {/* 2px surface-coloured gap so the segment boundary reads without
            relying on the hue difference alone. */}
        <Bar
          dataKey="collected"
          name="Collected"
          stackId="fees"
          fill={SERIES[2]}
          stroke="var(--color-card)"
          strokeWidth={2}
          maxBarSize={72}
        />
        <Bar
          dataKey="outstanding"
          name="Outstanding"
          stackId="fees"
          fill={SERIES[3]}
          stroke="var(--color-card)"
          strokeWidth={2}
          maxBarSize={72}
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ChartCard>
  );
}
