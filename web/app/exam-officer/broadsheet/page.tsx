import { ClipboardX } from 'lucide-react';
import { PageHeader } from '@/components/dashboard/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { getBroadsheet, getResultStatus, getScores } from '@/lib/actions/results';
import { apiFetch } from '@/lib/api';
import type { ClassDto, TermDto } from '@/lib/types/academic';
import { ArmPicker } from './arm-picker';
import { BroadsheetSection } from './broadsheet-section';

type ChipStatus = 'submitted' | 'in-progress' | 'not-started';

const CHIP_VARIANT: Record<ChipStatus, 'success' | 'warning' | 'outline'> = {
  submitted: 'success',
  'in-progress': 'warning',
  'not-started': 'outline',
};
const CHIP_LABEL: Record<ChipStatus, string> = {
  submitted: 'Submitted',
  'in-progress': 'In Progress',
  'not-started': 'Not Started',
};

export default async function ExamOfficerBroadsheetPage({
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
        <PageHeader title="Broadsheet & Collation" description="Collate scores and route results for approval." />
        <Empty className="border border-dashed border-border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ClipboardX />
            </EmptyMedia>
            <EmptyTitle>No classes set up yet</EmptyTitle>
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

  const subjectChips = await Promise.all(
    status.subjects.map(async (subject) => {
      if (subject.locked) {
        return { ...subject, chipStatus: 'submitted' as ChipStatus };
      }
      const grid = await getScores(subject.classSubjectId, currentTerm.id);
      const hasAnyScore = grid.rows.some((row) => row.scores.some((cell) => cell.score != null));
      return { ...subject, chipStatus: (hasAnyScore ? 'in-progress' : 'not-started') as ChipStatus };
    }),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Broadsheet & Collation"
        description={`${selectedArm.label} — ${currentTerm.name} term`}
      />
      {armOptions.length > 1 && <ArmPicker options={armOptions} selectedId={armId} />}

      <Card>
        <CardHeader>
          <CardTitle>Submission Status</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {subjectChips.length === 0 ? (
            <p className="text-sm text-muted-foreground">No subjects mapped to this class yet.</p>
          ) : (
            subjectChips.map((subject) => (
              <Badge key={subject.classSubjectId} variant={CHIP_VARIANT[subject.chipStatus]}>
                {subject.subjectName}: {CHIP_LABEL[subject.chipStatus]}
              </Badge>
            ))
          )}
        </CardContent>
      </Card>

      <BroadsheetSection armId={armId} termId={currentTerm.id} status={status} rows={broadsheet.rows} />
    </div>
  );
}
