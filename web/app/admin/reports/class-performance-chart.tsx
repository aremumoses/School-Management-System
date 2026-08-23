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
import type { TeacherPerformanceRow } from '@/lib/types/admin';

export function ClassPerformanceChart({ data }: { data: TeacherPerformanceRow[] }) {
  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No score data for this term yet.
      </p>
    );
  }

  // Sort ascending so the lowest-scoring classes are at the top (framing: "classes trending low")
  const sorted = [...data].sort((a, b) => a.averageScore - b.averageScore);

  const chartData = sorted.map((row) => ({
    label: `${row.className} / ${row.subjectName}`,
    average: row.averageScore,
    teacher: row.staffName,
  }));

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Sorted lowest first — these class/subject combinations may benefit from closer
        attention. This is not a staff performance ranking.
      </p>
      <div className="h-72 w-full overflow-x-auto">
        <div style={{ minWidth: Math.max(400, chartData.length * 64) }} className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 32, left: 0 }}>
              <CartesianGrid stroke="var(--color-border)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }}
                axisLine={{ stroke: 'var(--color-border)' }}
                tickLine={false}
                angle={-35}
                textAnchor="end"
                height={56}
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
                formatter={(value) => [`${Number(value).toFixed(1)}%`, 'Avg Score']}
                labelFormatter={(label) => {
                  const item = chartData.find((d) => d.label === label);
                  return item ? `${label} — ${item.teacher}` : label;
                }}
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
