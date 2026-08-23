import {
  AlertTriangle,
  Banknote,
  FileText,
  HandCoins,
  Landmark,
  PiggyBank,
  Receipt,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import { auth } from '@/auth';
import { ActivityFeed } from '@/components/dashboard/activity-feed';
import { EmptyState } from '@/components/dashboard/empty-state';
import { GreetingHeader } from '@/components/dashboard/greeting-header';
import { QuickActions } from '@/components/dashboard/quick-actions';
import { StatCard } from '@/components/dashboard/stat-card';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getExpensesSummary, getFinanceTrends } from '@/lib/actions/fees';
import { apiFetch } from '@/lib/api';
import { formatNaira } from '@/lib/format';
import type { AcademicSessionDto, SchoolDto, TermDto } from '@/lib/types/academic';
import type { AuditLogListResponse } from '@/lib/types/admin';
import type {
  CollectionSummaryDto,
  DefaulterRowDto,
  ExpensesSummaryDto,
  FinanceTrendsDto,
  OutstandingReportDto,
} from '@/lib/types/fees';
import { CollectionRatePanel, OutstandingByClassPanel } from './finance-charts';

/**
 * Bursar finance overview — new-design §18/§19 ("Total fees, collected,
 * outstanding, overdue, collection rate" plus revenue against expenses).
 *
 * The KPI row is ordered by how much it should worry the reader, not by
 * size: what came in, what hasn't, who is overdue. Expenses sit alongside
 * income rather than under it, because "we collected ₦4m" means nothing on
 * its own — net is the number a bursar reports upward.
 */
export default async function BursarHomePage() {
  const session = await auth();

  const [school, currentTerm, sessions] = await Promise.all([
    safe(() => apiFetch<SchoolDto>('/school')),
    safe(() => apiFetch<TermDto>('/terms/current')),
    safe(() => apiFetch<AcademicSessionDto[]>('/academic-sessions'), [] as AcademicSessionDto[]),
  ]);

  const currentSession = sessions?.find((entry) =>
    entry.terms.some((term) => term.id === currentTerm?.id),
  );

  const [collection, outstanding, trends, expenses, defaulters, activity] = await Promise.all([
    currentTerm
      ? safe(() =>
          apiFetch<CollectionSummaryDto>(
            `/reports/finance/collection-summary?termId=${currentTerm.id}`,
          ),
        )
      : Promise.resolve(null),
    safe(() => apiFetch<OutstandingReportDto>('/reports/finance/outstanding')),
    safe(() => getFinanceTrends('term')),
    currentTerm
      ? safe(() =>
          getExpensesSummary({
            from: currentTerm.startDate?.slice(0, 10),
            to: currentTerm.endDate?.slice(0, 10),
          }),
        )
      : Promise.resolve(null),
    safe(() => apiFetch<DefaulterRowDto[]>('/invoices/defaulters'), [] as DefaulterRowDto[]),
    safe(
      () =>
        apiFetch<AuditLogListResponse>('/audit-log?page=1&pageSize=40').then((res) => res.data),
      [],
    ),
  ]);

  const expected = collection?.totalExpected ?? 0;
  const collected = collection?.totalCollected ?? 0;
  const rate = expected > 0 ? (collected / expected) * 100 : null;

  const ratePoints = ((trends as FinanceTrendsDto | null)?.points ?? [])
    .filter((point) => point.collectionRate != null)
    .map((point) => ({ label: point.label, rate: point.collectionRate as number }));

  const byClass = (collection?.byClass ?? []).map((row) => ({
    className: row.className,
    collected: row.collected,
    outstanding: row.outstanding,
  }));

  // Biggest debts first — that is the call list, in order.
  const topDefaulters = [...(defaulters ?? [])]
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 6);

  return (
    <div className="space-y-6">
      <GreetingHeader
        name={session?.user.name ?? 'Bursar'}
        schoolName={school?.name}
        session={currentSession?.name}
        term={currentTerm?.name}
        today={new Date()}
        actions={
          <>
            <Button variant="outline" size="lg" render={<Link href="/bursar/reports" />}>
              <TrendingUp className="size-4" />
              Reports
            </Button>
            <Button size="lg" render={<Link href="/bursar/payments/record" />}>
              <HandCoins className="size-4" />
              Record payment
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Invoiced this term"
          value={formatNaira(expected)}
          description={currentTerm?.name ?? 'No current term'}
          icon={FileText}
          variant="violet"
          href="/bursar/invoices"
        />
        <StatCard
          label="Collected"
          value={formatNaira(collected)}
          description={rate != null ? `${rate.toFixed(1)}% of invoiced` : 'No invoices raised'}
          icon={PiggyBank}
          variant={rate == null ? 'default' : rate >= 75 ? 'success' : rate >= 40 ? 'warning' : 'error'}
          href="/bursar/receipts"
        />
        <StatCard
          label="Outstanding"
          value={formatNaira(collection?.totalOutstanding ?? 0)}
          description="This term's unpaid balance"
          icon={Wallet}
          variant={(collection?.totalOutstanding ?? 0) > 0 ? 'warning' : 'success'}
          href="/bursar/defaulters"
        />
        <StatCard
          label="Defaulters"
          value={defaulters?.length ?? 0}
          description="Invoices past their due date"
          icon={AlertTriangle}
          variant={(defaulters?.length ?? 0) > 0 ? 'error' : 'default'}
          href="/bursar/defaulters"
        />
        <StatCard
          label="School-wide arrears"
          value={formatNaira(outstanding?.totalOutstanding ?? 0)}
          description="Across every term, not just this one"
          icon={Landmark}
          variant="orange"
          href="/bursar/reports"
        />
        <StatCard
          label="Expenses this term"
          value={formatNaira((expenses as ExpensesSummaryDto | null)?.totalExpenses ?? 0)}
          description="Recorded outgoings"
          icon={Banknote}
          variant="blue"
          href="/bursar/expenses"
        />
        <StatCard
          label="Net position"
          value={formatNaira((expenses as ExpensesSummaryDto | null)?.netIncome ?? 0)}
          description="Collected less expenses"
          icon={TrendingUp}
          variant={
            ((expenses as ExpensesSummaryDto | null)?.netIncome ?? 0) >= 0 ? 'success' : 'error'
          }
          href="/bursar/reports"
        />
        <StatCard
          label="Collection rate"
          value={rate != null ? `${rate.toFixed(1)}%` : '—'}
          description="Current term"
          icon={Receipt}
          variant={rate == null ? 'default' : rate >= 75 ? 'success' : rate >= 40 ? 'warning' : 'error'}
          trend={ratePoints.length > 1 ? ratePoints.map((point) => point.rate) : undefined}
          href="/bursar/reports"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <CollectionRatePanel points={ratePoints} />
        <OutstandingByClassPanel rows={byClass} />
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1.15fr_1fr]">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Largest outstanding balances</CardTitle>
            <CardAction>
              <Button variant="ghost" size="sm" render={<Link href="/bursar/defaulters" />}>
                View all
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {topDefaulters.length === 0 ? (
              <EmptyState
                compact
                icon={PiggyBank}
                title="No overdue invoices"
                description="Every invoice past its due date has been settled."
              />
            ) : (
              <ul className="divide-y divide-border">
                {topDefaulters.map((row) => (
                  <li key={row.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {row.studentName}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {row.admissionNumber} · {row.className}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-foreground tabular-nums">
                      {formatNaira(row.balance)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <ActivityFeed entries={activity ?? []} title="Recent finance activity" />
      </div>

      <QuickActions
        actions={[
          { label: 'Record payment', href: '/bursar/payments/record', icon: HandCoins, hint: 'Cash, transfer or POS' },
          { label: 'Raise invoices', href: '/bursar/invoices', icon: FileText, hint: 'Generate for a class or term' },
          { label: 'Issue receipt', href: '/bursar/receipts', icon: Receipt, hint: 'Reprint or send' },
          { label: 'Log an expense', href: '/bursar/expenses', icon: Banknote, hint: 'Salaries, utilities, supplies' },
          { label: 'Chase defaulters', href: '/bursar/defaulters', icon: AlertTriangle, hint: 'Overdue balances' },
          { label: 'Fee structure', href: '/bursar/fee-structures', icon: Wallet, hint: 'Components and amounts' },
        ]}
      />
    </div>
  );
}

async function safe<T>(fetcher: () => Promise<T>): Promise<T | null>;
async function safe<T>(fetcher: () => Promise<T>, fallback: T): Promise<T>;
async function safe<T>(fetcher: () => Promise<T>, fallback: T | null = null) {
  try {
    return await fetcher();
  } catch {
    return fallback;
  }
}
