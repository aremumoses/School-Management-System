import { Wallet } from 'lucide-react';
import { PageHeader } from '@/components/dashboard/page-header';
import { StatCard } from '@/components/dashboard/stat-card';
import { listExpenses } from '@/lib/actions/fees';
import { formatNaira } from '@/lib/format';
import { AddExpenseDialog } from './add-expense-dialog';
import { ExpenseFilters } from './expense-filters';
import { ExpensesTable } from './expenses-table';

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; category?: string }>;
}) {
  const params = await searchParams;
  const { data: expenses, totalAmount } = await listExpenses({
    from: params.from,
    to: params.to,
    category: params.category,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expenses"
        description="The school's non-fee expenditure ledger — every entry is audit-logged, and voided entries stay on record."
        action={<AddExpenseDialog />}
      />

      <div className="grid max-w-sm grid-cols-1">
        <StatCard
          label="Total for this filter"
          value={formatNaira(totalAmount)}
          description={`${expenses.length} entr${expenses.length === 1 ? 'y' : 'ies'}`}
          icon={Wallet}
          variant="default"
        />
      </div>

      <ExpenseFilters
        from={params.from}
        to={params.to}
        category={params.category}
      />
      <ExpensesTable rows={expenses} />
    </div>
  );
}
