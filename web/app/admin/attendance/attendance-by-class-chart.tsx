'use client';

import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts';
import {
  AXIS_TICK,
  ChartCard,
  GRID_PROPS,
  SERIES,
  TOOLTIP_PROPS,
} from '@/components/dashboard/chart-kit';

export interface ClassAttendanceRate {
  className: string;
  rate: number;
}

/** One series, so no legend — the card title names it (design system §7). */
export function AttendanceByClassChart({ data }: { data: ClassAttendanceRate[] }) {
  return (
    <ChartCard
      title="Attendance Rate by Class (Today)"
      description="Students marked present or late, out of those marked."
      height={256}
      isEmpty={data.length === 0}
      emptyMessage="No attendance has been marked yet today."
    >
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid {...GRID_PROPS} />
        <XAxis
          dataKey="className"
          tick={AXIS_TICK}
          axisLine={{ stroke: 'var(--color-border)' }}
          tickLine={false}
        />
        <YAxis domain={[0, 100]} tick={AXIS_TICK} axisLine={false} tickLine={false} unit="%" />
        <Tooltip {...TOOLTIP_PROPS} formatter={(value) => [`${value}%`, 'Attendance rate']} />
        <Bar dataKey="rate" fill={SERIES[0]} radius={[4, 4, 0, 0]} maxBarSize={24} />
      </BarChart>
    </ChartCard>
  );
}
