'use client';

import { useState } from 'react';
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
import type { SubjectPerformanceRow } from '@/lib/types/admin';

export function SubjectPerformanceChart({ data }: { data: SubjectPerformanceRow[] }) {
  const [sortBy, setSortBy] = useState<'score' | 'name'>('score');

  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No score data for this term yet.
      </p>
    );
  }

  const sorted = [...data].sort((a, b) =>
    sortBy === 'score'
      ? b.averageScore - a.averageScore
      : a.subjectName.localeCompare(b.subjectName),
  );

  const chartData = sorted.map((row) => ({
    name: row.subjectName,
    average: row.averageScore,
    entries: row.entryCount,
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        Sort by:
        <button
          className={sortBy === 'score' ? 'font-semibold text-foreground' : 'hover:text-foreground'}
          onClick={() => setSortBy('score')}
        >
          Score
        </button>
        <span>/</span>
        <button
          className={sortBy === 'name' ? 'font-semibold text-foreground' : 'hover:text-foreground'}
          onClick={() => setSortBy('name')}
        >
          Name
        </button>
      </div>
      <div className="h-72 w-full overflow-x-auto">
        <div style={{ minWidth: Math.max(400, chartData.length * 60) }} className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 24, left: 0 }}>
              <CartesianGrid stroke="var(--color-border)" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
                axisLine={{ stroke: 'var(--color-border)' }}
                tickLine={false}
                angle={-30}
                textAnchor="end"
                height={48}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => `${v}%`}
              />
              <Tooltip
                cursor={{ fill: 'var(--color-muted)' }}
                contentStyle={{
                  borderRadius: 8,
                  borderColor: 'var(--color-border)',
                  fontSize: 13,
                }}
                formatter={(value, name) => [
                  name === 'average' ? `${Number(value).toFixed(1)}%` : value,
                  name === 'average' ? 'Avg Score' : 'Score Entries',
                ]}
              />
              <Bar dataKey="average" radius={[6, 6, 0, 0]} maxBarSize={48}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      entry.average >= 70
                        ? 'var(--color-success)'
                        : entry.average >= 50
                          ? 'var(--color-warning)'
                          : 'var(--color-destructive)'
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
