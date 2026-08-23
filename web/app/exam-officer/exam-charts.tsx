'use client';

import { Bar, BarChart, CartesianGrid, Cell, Tooltip, XAxis, YAxis } from 'recharts';
import {
  AXIS_TICK,
  ChartCard,
  GRID_PROPS,
  SEMANTIC,
  TOOLTIP_PROPS,
} from '@/components/dashboard/chart-kit';

/**
 * Pass rate per subject, school-wide.
 *
 * Bars are coloured by *band*, not by subject: this is a status encoding
 * (is this subject in trouble?) rather than a categorical one, so it draws
 * from the reserved status tokens and every bar of the same band shares a
 * colour. Colour is never the only cue — the value axis carries the number,
 * and the tooltip repeats it.
 */
export function SubjectPassRatePanel({
  rows,
}: {
  rows: { subjectName: string; passRate: number }[];
}) {
  return (
    <ChartCard
      title="Pass rate by subject"
      description="Current term, school-wide — 50% and above counts as a pass"
      height={300}
      isEmpty={rows.length === 0}
      emptyMessage="Pass rates appear once scores are entered for this term."
      className="lg:col-span-2"
    >
      <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
        <CartesianGrid {...GRID_PROPS} />
        <XAxis
          dataKey="subjectName"
          tick={AXIS_TICK}
          axisLine={false}
          tickLine={false}
          interval={0}
          angle={rows.length > 6 ? -30 : 0}
          textAnchor={rows.length > 6 ? 'end' : 'middle'}
          height={rows.length > 6 ? 60 : 30}
        />
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
          formatter={(value) => [`${Number(value).toFixed(1)}%`, 'Pass rate']}
        />
        <Bar dataKey="passRate" name="Pass rate" radius={[4, 4, 0, 0]} maxBarSize={56}>
          {rows.map((row) => (
            <Cell
              key={row.subjectName}
              fill={
                row.passRate >= 70
                  ? SEMANTIC.positive
                  : row.passRate >= 50
                    ? SEMANTIC.caution
                    : SEMANTIC.negative
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ChartCard>
  );
}
