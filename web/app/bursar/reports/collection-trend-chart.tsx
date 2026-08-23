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
import type { FinanceTrendsDto } from '@/lib/types/fees';

export function CollectionTrendChart({
  termTrends,
  sessionTrends,
}: {
  termTrends: FinanceTrendsDto;
  sessionTrends: FinanceTrendsDto;
}) {
  const [granularity, setGranularity] = useState<'term' | 'session'>('term');
  const trends = granularity === 'term' ? termTrends : sessionTrends;

  if (trends.points.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No invoice data yet — trends appear once invoices exist across terms.
      </p>
    );
  }

  const chartData = trends.points.map((point) => ({
    label: point.label,
    rate: point.collectionRate ?? 0,
  }));

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={granularity === 'term' ? 'default' : 'outline'}
          onClick={() => setGranularity('term')}
        >
          Term-on-term
        </Button>
        <Button
          size="sm"
          variant={granularity === 'session' ? 'default' : 'outline'}
          onClick={() => setGranularity('session')}
        >
          Session-on-session
        </Button>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
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
              formatter={(value) => [`${Number(value).toFixed(1)}%`, 'Collection Rate']}
            />
            <Legend formatter={() => 'Collection Rate'} wrapperStyle={{ fontSize: 12 }} />
            <Line
              type="monotone"
              dataKey="rate"
              stroke="var(--color-primary)"
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
