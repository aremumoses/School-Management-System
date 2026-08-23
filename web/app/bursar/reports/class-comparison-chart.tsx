'use client';

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatNaira } from '@/lib/format';
import type { CollectionSummaryByClassDto } from '@/lib/types/fees';

export function ClassComparisonChart({ data }: { data: CollectionSummaryByClassDto[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <CartesianGrid stroke="var(--color-border)" vertical={false} />
          <XAxis
            dataKey="className"
            tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }}
            axisLine={{ stroke: 'var(--color-border)' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value: number) => `₦${(value / 1000).toLocaleString()}k`}
          />
          <Tooltip
            cursor={{ fill: 'var(--color-muted)' }}
            contentStyle={{ borderRadius: 8, borderColor: 'var(--color-border)', fontSize: 13 }}
            formatter={(value, name) => [formatNaira(Number(value)), name === 'expected' ? 'Expected' : 'Collected']}
          />
          <Legend
            formatter={(value) => (value === 'expected' ? 'Expected' : 'Collected')}
            wrapperStyle={{ fontSize: 12 }}
          />
          <Bar dataKey="expected" fill="var(--color-muted-foreground)" radius={[6, 6, 0, 0]} maxBarSize={48} />
          <Bar dataKey="collected" fill="var(--color-primary)" radius={[6, 6, 0, 0]} maxBarSize={48} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
