import { ClipboardX } from 'lucide-react';
import { PageHeader } from '@/components/dashboard/page-header';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { getBroadsheet, getResultStatus } from '@/lib/actions/results';
import { apiFetch } from '@/lib/api';
import type { ClassDto, TermDto } from '@/lib/types/academic';
import { ArmPicker } from './arm-picker';
import { ResultApprovalSection } from './result-approval-section';

export default async function AdminResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ arm?: string }>;
}) {
  const params = await searchParams;

  const [classes, currentTerm] = await Promise.all([
    apiFetch<ClassDto[]>('/classes'),
    apiFetch<TermDto>('/terms/current'),
  ]);
  const armOptions = classes.flatMap((klass) =>
    klass.arms.map((arm) => ({ id: arm.id, label: `${klass.name} ${arm.name}` })),
  );

  if (armOptions.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Result Approvals" description="Review, approve, and publish term results." />
        <Empty className="rounded-xl bg-card py-12 dark:ring-1 dark:ring-foreground/10">
          <EmptyHeader>
            <EmptyMedia
              variant="icon"
              className="size-12 rounded-full bg-primary/10 text-primary [&_svg:not([class*='size-'])]:size-5"
            >
              <ClipboardX />
            </EmptyMedia>
            <EmptyTitle className="text-base font-semibold text-heading">No classes set up yet</EmptyTitle>
            <EmptyDescription>Create classes and arms in Academic Setup first.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  const armId = armOptions.some((a) => a.id === params.arm) ? params.arm! : armOptions[0].id;
  const selectedArm = armOptions.find((a) => a.id === armId)!;

  const [status, broadsheet] = await Promise.all([
    getResultStatus(armId, currentTerm.id),
    getBroadsheet(armId, currentTerm.id),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Result Approvals"
        description={`${selectedArm.label} — ${currentTerm.name} term`}
        action={armOptions.length > 1 ? <ArmPicker options={armOptions} selectedId={armId} /> : undefined}
      />
      <ResultApprovalSection armId={armId} termId={currentTerm.id} status={status} rows={broadsheet.rows} />
    </div>
  );
}
