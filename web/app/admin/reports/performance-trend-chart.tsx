'use client';

import { useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Button } from '@/components/ui/button';
import type { PerformanceTrendPoint } from '@/lib/types/admin';

/**
 * The five validated categorical slots, in their fixed order (design system
 * §7). Previously this list padded itself out to eight with raw hex values,
 * which had two problems: those hues were never checked for colourblind
 * separation against each other, and being literals they stayed identical in
 * dark mode while everything around them changed.
 *
 * Five is a real cap, not a shortcut — see `visibleClasses` below for what
 * happens past it.
 */
const CLASS_COLORS = [
  'var(--color-chart-1)',
  'var(--color-chart-2)',
  'var(--color-chart-3)',
  'var(--color-chart-4)',
  'var(--color-chart-5)',
];

/** Beyond the palette's length, more lines means fewer readable lines. */
const MAX_CLASS_SERIES = CLASS_COLORS.length;

export function PerformanceTrendChart({ data }: { data: PerformanceTrendPoint[] }) {
  const [mode, setMode] = useState<'schoolwide' | 'per-class'>('schoolwide');

  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No score data for this session yet.
      </p>
    );
  }

  // Collect all class names across terms
  const classNames = [
    ...new Set(data.flatMap((d) => d.byClass.map((c) => c.className))),
  ];
  // Overflow is dropped rather than recoloured: a sixth line would have to
  // reuse a hue already on the chart, which is worse than not drawing it.
  const visibleClasses = classNames.slice(0, MAX_CLASS_SERIES);
  const hiddenClassCount = classNames.length - visibleClasses.length;

  const chartData = data.map((point) => {
    const row: Record<string, number | string> = {
      term: point.termName,
      Schoolwide: point.averageScore,
    };
    for (const c of point.byClass) {
      row[c.className] = c.averageScore;
    }
    return row;
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={mode === 'schoolwide' ? 'default' : 'outline'}
          onClick={() => setMode('schoolwide')}
        >
          Schoolwide
        </Button>
        <Button
          size="sm"
          variant={mode === 'per-class' ? 'default' : 'outline'}
          onClick={() => setMode('per-class')}
        >
          Per Class
        </Button>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
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
              formatter={(value) => [`${Number(value).toFixed(1)}%`]}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />

            {mode === 'schoolwide' ? (
              <Line
                type="monotone"
                dataKey="Schoolwide"
                stroke="var(--color-primary)"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            ) : (
              visibleClasses.map((name, i) => (
                <Line
                  key={name}
                  type="monotone"
                  dataKey={name}
                  stroke={CLASS_COLORS[i]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              ))
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {mode === 'per-class' && hiddenClassCount > 0 && (
        <p className="text-xs text-muted-foreground">
          Showing the first {visibleClasses.length} classes. {hiddenClassCount} more{' '}
          {hiddenClassCount === 1 ? 'class is' : 'classes are'} not charted — use the
          per-class breakdown below for the full list.
        </p>
      )}
    </div>
  );
}
