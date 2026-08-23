import { ClipboardList } from 'lucide-react';
import { PageHeader } from '@/components/dashboard/page-header';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { listAppraisalCycles, listAppraisalForms } from '@/lib/actions/appraisal';
import { AppraisalFormEditor } from './appraisal-form-editor';
import { CycleList } from './cycle-list';
import { NewCycleDialog } from './new-cycle-dialog';

export default async function AppraisalsPage() {
  const [forms, cycles] = await Promise.all([listAppraisalForms(), listAppraisalCycles()]);
  const currentForm = forms[0] ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Performance Appraisal"
        description="Configure the appraisal rubric, then run cycles and track sign-off."
        action={<NewCycleDialog hasForm={Boolean(currentForm)} />}
      />

      <AppraisalFormEditor currentForm={currentForm} />

      {cycles.length === 0 ? (
        <Empty className="border border-dashed border-border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ClipboardList />
            </EmptyMedia>
            <EmptyTitle>No appraisal cycles yet</EmptyTitle>
            <EmptyDescription>
              {currentForm
                ? 'Start one above.'
                : 'Save the appraisal form above first, then start a cycle.'}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <CycleList cycles={cycles} />
      )}
    </div>
  );
}
