'use client';

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
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

/**
 * The three analytics panels on the Admin dashboard — new-design §5.
 *
 * All three are fed from analytics endpoints that already existed for the
 * Reports screens; nothing here computes a figure the API doesn't already
 * publish, so the dashboard and the reports can't disagree with each other.
 */

export interface TrendPoint {
  label: string;
  value: number;
}

export interface ClassCollectionPoint {
  className: string;
  collected: number;
  outstanding: number;
}

/** Attendance rate per term. One series, so no legend — the title names it. */
export function AttendanceTrendPanel({ points }: { points: TrendPoint[] }) {
  return (
    <ChartCard
      title="Attendance"
      description="School-wide daily attendance rate, per term"
      isEmpty={points.length < 2}
      emptyMessage="Attendance trends appear once a second term has been marked."
    >
      <AreaChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
        <defs>
          <linearGradient id="attendanceFill" x1="0" y1="0" x2="0" y2="1">
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
          formatter={(value) => [`${Number(value).toFixed(1)}%`, 'Attendance']}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={SERIES[0]}
          strokeWidth={2}
          fill="url(#attendanceFill)"
          dot={{ r: 3, strokeWidth: 0, fill: SERIES[0] }}
          activeDot={{ r: 5 }}
        />
      </AreaChart>
    </ChartCard>
  );
}

/** Average score per term. Same single-series treatment as attendance. */
export function PerformanceTrendPanel({ points }: { points: TrendPoint[] }) {
  return (
    <ChartCard
      title="Academic performance"
      description="School-wide average score, per term"
      isEmpty={points.length < 2}
      emptyMessage="Performance trends appear once results exist for two terms."
    >
      <LineChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
        <CartesianGrid {...GRID_PROPS} />
        <XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} />
        <YAxis
          domain={[0, 100]}
          tick={AXIS_TICK}
          axisLine={false}
          tickLine={false}
          width={40}
        />
        <Tooltip
          {...TOOLTIP_PROPS}
          formatter={(value) => [`${Number(value).toFixed(1)}`, 'Average score']}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke={SERIES[1]}
          strokeWidth={2}
          dot={{ r: 3, strokeWidth: 0, fill: SERIES[1] }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ChartCard>
  );
}

/**
 * Collected vs outstanding per class. Two series, so a legend is mandatory —
 * and the bars are stacked because the pair sums to a real quantity (what
 * the class was invoiced), which grouped bars would hide.
 */
export function FeeCollectionPanel({ rows }: { rows: ClassCollectionPoint[] }) {
  return (
    <ChartCard
      title="Fee collection by class"
      description="Current term — collected against what is still outstanding"
      height={300}
      isEmpty={rows.length === 0}
      emptyMessage="Collection figures appear once this term's invoices are raised."
      className="lg:col-span-2"
    >
      <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 4 }}>
        <CartesianGrid {...GRID_PROPS} />
        <XAxis
          dataKey="className"
          tick={AXIS_TICK}
          axisLine={false}
          tickLine={false}
          interval={0}
        />
        <YAxis
          tick={AXIS_TICK}
          axisLine={false}
          tickLine={false}
          width={64}
          tickFormatter={(value: number) => compactNaira(value)}
        />
        <Tooltip
          {...TOOLTIP_PROPS}
          formatter={(value, name) => [formatNaira(Number(value)), String(name)]}
        />
        <Legend {...LEGEND_PROPS} />
        {/* 2px surface-coloured gap between the stacked segments so the
            boundary reads without relying on the hue difference alone. */}
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

/**
 * Head-count per class. A magnitude comparison across one dimension, so it
 * is one hue at one step — colouring each bar differently would imply the
 * classes are categories that mean something different, which they aren't.
 */
export function StudentsByClassPanel({ rows }: { rows: { className: string; count: number }[] }) {
  return (
    <ChartCard
      title="Students by class"
      description="Active enrolment across the school"
      isEmpty={rows.length === 0}
      emptyMessage="Enrolment appears once students are assigned to classes."
    >
      <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid {...GRID_PROPS} />
        <XAxis dataKey="className" tick={AXIS_TICK} axisLine={false} tickLine={false} interval={0} />
        <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} width={40} allowDecimals={false} />
        <Tooltip {...TOOLTIP_PROPS} formatter={(value) => [`${value}`, 'Students']} />
        <Bar dataKey="count" name="Students" radius={[4, 4, 0, 0]} maxBarSize={44}>
          {rows.map((row) => (
            <Cell key={row.className} fill={SERIES[0]} />
          ))}
        </Bar>
      </BarChart>
    </ChartCard>
  );
}

/** ₦1.2m / ₦840k — full precision belongs in the tooltip, not the axis. */
function compactNaira(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `₦${(value / 1_000_000).toFixed(1)}m`;
  if (Math.abs(value) >= 1_000) return `₦${Math.round(value / 1_000)}k`;
  return `₦${value}`;
}
