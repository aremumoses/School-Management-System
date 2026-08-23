'use client';

import { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getPassRateStats } from '@/lib/actions/exam-logistics';
import type { ClassDto, SubjectDto } from '@/lib/types/academic';
import type { PassRateRow, SubjectComparisonRow } from '@/lib/types/exam-logistics';

function PassRateChart({
  termId,
  initialRows,
  classes,
  subjects,
}: {
  termId: string;
  initialRows: PassRateRow[];
  classes: ClassDto[];
  subjects: SubjectDto[];
}) {
  const [rows, setRows] = useState(initialRows);
  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function applyFilters(nextClassId: string, nextSubjectId: string) {
    setIsLoading(true);
    try {
      const data = await getPassRateStats(
        termId,
        nextClassId || undefined,
        nextSubjectId || undefined,
      );
      setRows(data.filter((r) => r.studentCount > 0));
    } finally {
      setIsLoading(false);
    }
  }

  const chartData = rows.map((r) => ({
    label: `${r.subjectName} (${r.className})`,
    Average: r.average === null ? 0 : Number(r.average.toFixed(1)),
    'Pass Rate': r.passRate === null ? 0 : Number(r.passRate.toFixed(1)),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Pass Rate — per Subject / Class</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Select
            value={classId}
            onValueChange={(v) => {
              const next = v ?? '';
              setClassId(next);
              void applyFilters(next, subjectId);
            }}
            items={[
              { value: '', label: 'All classes' },
              ...classes.map((c) => ({ value: c.id, label: c.name })),
            ]}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All classes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All classes</SelectItem>
              {classes.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={subjectId}
            onValueChange={(v) => {
              const next = v ?? '';
              setSubjectId(next);
              void applyFilters(classId, next);
            }}
            items={[
              { value: '', label: 'All subjects' },
              ...subjects.map((s) => ({ value: s.id, label: s.name })),
            ]}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All subjects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All subjects</SelectItem>
              {subjects.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
        ) : chartData.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No scored students for this selection yet.
          </p>
        ) : (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 40, left: 0 }}>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
                  axisLine={{ stroke: 'var(--color-border)' }}
                  tickLine={false}
                  angle={-20}
                  textAnchor="end"
                  height={60}
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
                  formatter={(value) => [`${Number(value).toFixed(1)}%`]}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Average" fill="var(--color-chart-2)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Pass Rate" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SubjectComparisonChart({ rows }: { rows: SubjectComparisonRow[] }) {
  const chartData = rows.map((r) => ({
    label: r.subjectName,
    Average: r.average === null ? 0 : Number(r.average.toFixed(1)),
    'Pass Rate': r.passRate === null ? 0 : Number(r.passRate.toFixed(1)),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Subject Comparison — Schoolwide</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No scored students yet this term.
          </p>
        ) : (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 40, left: 0 }}>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
                  axisLine={{ stroke: 'var(--color-border)' }}
                  tickLine={false}
                  angle={-20}
                  textAnchor="end"
                  height={60}
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
                  formatter={(value) => [`${Number(value).toFixed(1)}%`]}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Average" fill="var(--color-chart-2)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Pass Rate" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function StatisticsView({
  termId,
  passRate,
  subjectComparison,
  classes,
  subjects,
}: {
  termId: string;
  passRate: PassRateRow[];
  subjectComparison: SubjectComparisonRow[];
  classes: ClassDto[];
  subjects: SubjectDto[];
}) {
  return (
    <div className="space-y-6">
      <PassRateChart
        termId={termId}
        initialRows={passRate.filter((r) => r.studentCount > 0)}
        classes={classes}
        subjects={subjects}
      />
      <SubjectComparisonChart rows={subjectComparison} />
    </div>
  );
}
