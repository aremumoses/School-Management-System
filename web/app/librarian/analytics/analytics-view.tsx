'use client';

import { AlertTriangle, BookOpen, Library, TrendingUp } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/dashboard/stat-card';
import type { LibraryAnalytics } from '@/lib/types/library';

export function AnalyticsView({ analytics }: { analytics: LibraryAnalytics }) {
  const mostBorrowedData = analytics.mostBorrowed.map((b) => ({
    label: b.title.length > 20 ? `${b.title.slice(0, 20)}…` : b.title,
    loans: b.loanCount,
  }));
  const categoryData = analytics.categoryUsage.map((c) => ({
    label: c.category,
    loans: c.loanCount,
  }));
  const busiestData = analytics.busiestPeriods.map((p) => ({
    label: p.period,
    loans: p.loanCount,
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Total Loans"
          value={analytics.totalLoans}
          icon={BookOpen}
          variant="info"
        />
        <StatCard
          label="Overdue Rate"
          value={`${analytics.overdueRate.toFixed(1)}%`}
          icon={AlertTriangle}
          variant={analytics.overdueRate > 20 ? 'error' : 'success'}
        />
        <StatCard
          label="Categories Active"
          value={analytics.categoryUsage.length}
          icon={Library}
          variant="default"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Most-Borrowed Titles</CardTitle>
          </CardHeader>
          <CardContent>
            {mostBorrowedData.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No loans yet.</p>
            ) : (
              <div className="h-72 w-full overflow-x-auto">
                <div style={{ minWidth: Math.max(400, mostBorrowedData.length * 60) }} className="h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={mostBorrowedData} margin={{ top: 8, right: 8, bottom: 40, left: 0 }}>
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
                        allowDecimals={false}
                        tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        cursor={{ fill: 'var(--color-muted)' }}
                        contentStyle={{ borderRadius: 8, borderColor: 'var(--color-border)', fontSize: 13 }}
                      />
                      <Bar dataKey="loans" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Category Usage</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryData.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No loans yet.</p>
            ) : (
              <div className="h-72 w-full overflow-x-auto">
                <div style={{ minWidth: Math.max(400, categoryData.length * 60) }} className="h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryData} margin={{ top: 8, right: 8, bottom: 40, left: 0 }}>
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
                        allowDecimals={false}
                        tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        cursor={{ fill: 'var(--color-muted)' }}
                        contentStyle={{ borderRadius: 8, borderColor: 'var(--color-border)', fontSize: 13 }}
                      />
                      <Bar dataKey="loans" fill="var(--color-chart-2)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="size-4" aria-hidden="true" />
            Busiest Periods
          </CardTitle>
        </CardHeader>
        <CardContent>
          {busiestData.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No loans yet.</p>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={busiestData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="label"
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
                    cursor={{ stroke: 'var(--color-border)' }}
                    contentStyle={{ borderRadius: 8, borderColor: 'var(--color-border)', fontSize: 13 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="loans"
                    stroke="var(--color-primary)"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
