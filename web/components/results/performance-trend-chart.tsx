'use client';

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export interface TrendPoint {
  label: string;
  average: number;
}

export function PerformanceTrendChart({ data }: { data: TrendPoint[] }) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid stroke="var(--color-border)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
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
            cursor={{ stroke: 'var(--color-muted)' }}
            contentStyle={{ borderRadius: 8, borderColor: 'var(--color-border)', fontSize: 13 }}
            formatter={(value) => [`${value}%`, 'Average']}
          />
          <Line
            type="monotone"
            dataKey="average"
            stroke="var(--color-primary)"
            strokeWidth={2}
            dot={{ r: 4, fill: 'var(--color-primary)' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
