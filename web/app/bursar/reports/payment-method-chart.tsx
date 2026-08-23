'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatNaira } from '@/lib/format';
import type { CollectionSummaryByMethodDto } from '@/lib/types/fees';

const METHOD_LABELS: Record<string, string> = {
  CASH: 'Cash',
  BANK_TRANSFER: 'Bank Transfer',
  POS: 'POS',
  PAYSTACK: 'Online',
};

export function PaymentMethodChart({ data }: { data: CollectionSummaryByMethodDto[] }) {
  const chartData = data.map((row) => ({
    method: METHOD_LABELS[row.method] ?? row.method,
    amount: row.amount,
  }));

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <CartesianGrid stroke="var(--color-border)" vertical={false} />
          <XAxis
            dataKey="method"
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
            formatter={(value) => [formatNaira(Number(value)), 'Collected']}
          />
          <Bar dataKey="amount" fill="var(--color-chart-2)" radius={[6, 6, 0, 0]} maxBarSize={64} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
