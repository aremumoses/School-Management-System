import { Wallet } from 'lucide-react';
import { PageHeader } from '@/components/dashboard/page-header';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { listPayrollRuns, listSalaryStructures } from '@/lib/actions/hr';
import { RunPayrollDialog } from './run-payroll-dialog';
import { RunsList } from './runs-list';
import { SalaryStructureManager } from './salary-structure-manager';

export default async function PayrollPage() {
  const [structures, runs] = await Promise.all([listSalaryStructures(), listPayrollRuns()]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payroll"
        description="Set up salary grades, then run and approve monthly payroll."
        action={<RunPayrollDialog />}
      />

      <SalaryStructureManager structures={structures} />

      {runs.length === 0 ? (
        <Empty className="border border-dashed border-border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Wallet />
            </EmptyMedia>
            <EmptyTitle>No payroll runs yet</EmptyTitle>
            <EmptyDescription>
              Assign salary grades to staff, then run payroll for a month above.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <RunsList runs={runs} />
      )}
    </div>
  );
}
