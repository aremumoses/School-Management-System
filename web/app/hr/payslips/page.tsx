import { Receipt } from 'lucide-react';
import { PageHeader } from '@/components/dashboard/page-header';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { listPayslips } from '@/lib/actions/hr';
import { PayslipsTable } from './payslips-table';

export default async function PayslipsPage() {
  const payslips = await listPayslips();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payslips"
        description="Every generated payslip, per staff member and pay period."
      />

      {payslips.length === 0 ? (
        <Empty className="border border-dashed border-border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Receipt />
            </EmptyMedia>
            <EmptyTitle>No payslips yet</EmptyTitle>
            <EmptyDescription>Payslips appear here once a payroll run is approved.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <PayslipsTable payslips={payslips} />
      )}
    </div>
  );
}
