import { AlertTriangle, PiggyBank, Scale, Target, TrendingUp, Wallet } from 'lucide-react';
import { StatCard } from '@/components/dashboard/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/dashboard/page-header';
import { getExpensesSummary, getFinanceTrends } from '@/lib/actions/fees';
import { apiFetch } from '@/lib/api';
import { formatNaira } from '@/lib/format';
import type { AcademicSessionDto } from '@/lib/types/academic';
import type { CollectionSummaryDto, OutstandingReportDto } from '@/lib/types/fees';
import { ClassComparisonChart } from './class-comparison-chart';
import { CollectionTrendChart } from './collection-trend-chart';
import { ExportButtons } from './export-buttons';
import { PaymentMethodChart } from './payment-method-chart';
import { TermPicker, type TermOption } from './term-picker';

const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  SALARIES: 'Salaries',
  UTILITIES: 'Utilities',
  MAINTENANCE: 'Maintenance',
  SUPPLIES: 'Supplies',
  OTHER: 'Other',
};

export default async function FinancialReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ termId?: string }>;
}) {
  const params = await searchParams;
  const sessions = await apiFetch<AcademicSessionDto[]>('/academic-sessions');
  const terms: TermOption[] = sessions
    .flatMap((session) =>
      session.terms.map((term) => ({
        id: term.id,
        name: term.name,
        sessionName: session.name,
        isCurrent: term.isCurrent,
      })),
    )
    .sort((a, b) => (a.isCurrent === b.isCurrent ? 0 : a.isCurrent ? -1 : 1));

  const selectedTermId = terms.some((t) => t.id === params.termId)
    ? params.termId!
    : terms.find((t) => t.isCurrent)?.id ?? terms[0]?.id;

  if (!selectedTermId) {
    return (
      <div className="space-y-6">
        <PageHeader title="Financial Reports" />
        <p className="text-muted-foreground">Set up an academic session and term first.</p>
      </div>
    );
  }

  const termDates = sessions
    .flatMap((s) => s.terms)
    .find((t) => t.id === selectedTermId);

  const [summary, outstanding, termTrends, sessionTrends, expensesSummary] = await Promise.all([
    apiFetch<CollectionSummaryDto>(`/reports/finance/collection-summary?termId=${selectedTermId}`),
    apiFetch<OutstandingReportDto>('/reports/finance/outstanding'),
    getFinanceTrends('term'),
    getFinanceTrends('session'),
    getExpensesSummary({
      from: termDates?.startDate?.slice(0, 10),
      to: termDates?.endDate?.slice(0, 10),
    }),
  ]);

  const collectionRate = summary.totalExpected > 0 ? (summary.totalCollected / summary.totalExpected) * 100 : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financial Reports"
        description="Collection performance for the selected term, school-wide outstanding below."
        action={<ExportButtons summary={summary} outstanding={outstanding} />}
      />

      <TermPicker terms={terms} selectedTermId={selectedTermId} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Collected This Term"
          value={formatNaira(summary.totalCollected)}
          icon={PiggyBank}
          variant="success"
        />
        <StatCard
          label="Expected This Term"
          value={formatNaira(summary.totalExpected)}
          icon={Target}
        />
        <StatCard
          label="Collection Rate"
          value={`${collectionRate.toFixed(1)}%`}
          icon={TrendingUp}
          variant={collectionRate >= 75 ? 'success' : collectionRate >= 40 ? 'warning' : 'error'}
        />
        <StatCard
          label="Outstanding (school-wide)"
          value={formatNaira(outstanding.totalOutstanding)}
          icon={AlertTriangle}
          variant="warning"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Expected vs Collected, by Class</CardTitle>
          </CardHeader>
          <CardContent>
            {summary.byClass.length === 0 ? (
              <p className="text-sm text-muted-foreground">No invoices for this term yet.</p>
            ) : (
              <ClassComparisonChart data={summary.byClass} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment Method Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {summary.byMethod.length === 0 ? (
              <p className="text-sm text-muted-foreground">No payments recorded for this term yet.</p>
            ) : (
              <PaymentMethodChart data={summary.byMethod} />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Collection Rate Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <CollectionTrendChart termTrends={termTrends} sessionTrends={sessionTrends} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Expenses This Term</CardTitle>
          </CardHeader>
          <CardContent>
            {expensesSummary.byCategory.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No expenses recorded within this term&apos;s dates.
              </p>
            ) : (
              <ul className="divide-y divide-border text-sm">
                {expensesSummary.byCategory.map((entry) => (
                  <li key={entry.category} className="flex items-center justify-between py-2">
                    <span className="text-foreground">
                      {EXPENSE_CATEGORY_LABELS[entry.category] ?? entry.category}
                      <span className="ml-1.5 text-xs text-muted-foreground">
                        ({entry.count} entr{entry.count === 1 ? 'y' : 'ies'})
                      </span>
                    </span>
                    <span className="tabular-nums font-medium">{formatNaira(entry.amount)}</span>
                  </li>
                ))}
                <li className="flex items-center justify-between py-2 font-medium">
                  <span>Total</span>
                  <span className="tabular-nums">{formatNaira(expensesSummary.totalExpenses)}</span>
                </li>
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 content-start gap-4">
          <StatCard
            label="Expenses (term dates)"
            value={formatNaira(expensesSummary.totalExpenses)}
            icon={Wallet}
            variant="warning"
          />
          <StatCard
            label="Net Income (collected − expenses)"
            value={formatNaira(expensesSummary.netIncome)}
            description="Payments received within the term's dates, minus expenses"
            icon={Scale}
            variant={expensesSummary.netIncome >= 0 ? 'success' : 'error'}
          />
        </div>
      </div>
    </div>
  );
}
