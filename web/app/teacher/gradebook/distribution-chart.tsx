'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

// Grade bands are a status encoding, not a categorical one: they run
// fail -> pass, so they use the reserved status tokens rather than slots
// from the categorical series palette (design system §7). The previous
// mapping used --color-secondary, which is the *neutral* structural slot
// (Slate 100) — those bars were very nearly invisible on a white card.
const BUCKET_COLORS: Record<string, string> = {
  '0–39': 'var(--color-destructive)',
  '40–49': 'var(--color-warning)',
  '50–59': 'var(--color-warning)',
  '60–69': 'var(--color-success)',
  '70–100': 'var(--color-success)',
};

export function DistributionChart({
  data,
}: {
  data: { range: string; count: number }[];
}) {
  if (data.every((d) => d.count === 0)) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No scores recorded yet for this class/subject.
      </p>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--color-border)" vertical={false} />
          <XAxis
            dataKey="range"
            tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }}
            axisLine={{ stroke: 'var(--color-border)' }}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: 'var(--color-muted)' }}
            contentStyle={{ borderRadius: 8, borderColor: 'var(--color-border)', fontSize: 13 }}
            formatter={(value) => [value, 'Students']}
            labelFormatter={(label) => `Average ${label}%`}
          />
          <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={64}>
            {data.map((entry) => (
              <Cell key={entry.range} fill={BUCKET_COLORS[entry.range] ?? 'var(--color-chart-1)'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
