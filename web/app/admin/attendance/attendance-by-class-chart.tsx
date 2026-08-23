'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export interface ClassAttendanceRate {
  className: string;
  rate: number;
}

export function AttendanceByClassChart({ data }: { data: ClassAttendanceRate[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid stroke="var(--color-border)" vertical={false} />
          <XAxis
            dataKey="className"
            tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }}
            axisLine={{ stroke: 'var(--color-border)' }}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }}
            axisLine={false}
            tickLine={false}
            unit="%"
          />
          <Tooltip
            cursor={{ fill: 'var(--color-muted)' }}
            contentStyle={{
              borderRadius: 8,
              borderColor: 'var(--color-border)',
              fontSize: 13,
            }}
            formatter={(value) => [`${value}%`, 'Attendance rate']}
          />
          <Bar dataKey="rate" fill="var(--color-primary)" radius={[6, 6, 0, 0]} maxBarSize={64} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
