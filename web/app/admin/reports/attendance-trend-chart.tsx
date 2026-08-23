'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { AttendanceTrendPoint } from '@/lib/types/admin';

export function AttendanceTrendChart({ data }: { data: AttendanceTrendPoint[] }) {
  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No attendance data for this session yet.
      </p>
    );
  }

  const chartData = data.map((point) => ({
    term: point.termName,
    rate: point.attendanceRate,
    days: point.totalDays,
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="attendanceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
          <XAxis
            dataKey="term"
            tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }}
            axisLine={{ stroke: 'var(--color-border)' }}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `${v}%`}
          />
          <Tooltip
            cursor={{ stroke: 'var(--color-border)' }}
            contentStyle={{
              borderRadius: 8,
              borderColor: 'var(--color-border)',
              fontSize: 13,
            }}
            formatter={(value, name) => [
              name === 'rate' ? `${Number(value).toFixed(1)}%` : value,
              name === 'rate' ? 'Attendance Rate' : 'Records',
            ]}
          />
          <Area
            type="monotone"
            dataKey="rate"
            stroke="var(--color-primary)"
            strokeWidth={2}
            fill="url(#attendanceGradient)"
            dot={{ r: 4, fill: 'var(--color-primary)' }}
            activeDot={{ r: 6 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
