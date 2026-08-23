import { Users } from 'lucide-react';
import { auth } from '@/auth';
import { PageHeader } from '@/components/dashboard/page-header';
import { BroadsheetTable } from '@/components/results/broadsheet-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { getBroadsheet, getConductRatings } from '@/lib/actions/results';
import { apiFetch } from '@/lib/api';
import type { ClassDto, TermDto } from '@/lib/types/academic';
import { ArmSwitcher } from './arm-switcher';
import { ClassRatingsForm } from './class-ratings-form';

export default async function ClassRatingsPage({
  searchParams,
}: {
  searchParams: Promise<{ arm?: string }>;
}) {
  const params = await searchParams;
  const session = await auth();
  const userId = session!.user.id;

  const [classes, currentTerm] = await Promise.all([
    apiFetch<ClassDto[]>('/classes'),
    apiFetch<TermDto>('/terms/current'),
  ]);

  const myArms = classes.flatMap((klass) =>
    klass.arms
      .filter((arm) => arm.classTeacher?.id === userId)
      .map((arm) => ({ id: arm.id, label: `${klass.name} ${arm.name}` })),
  );

  if (myArms.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Class Teacher Ratings"
          description="Affective/psychomotor ratings and form comments for your class."
        />
        <Empty className="border border-dashed border-border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Users />
            </EmptyMedia>
            <EmptyTitle>You&apos;re not set as a Class Teacher</EmptyTitle>
            <EmptyDescription>
              This screen is only for staff assigned as the Class Teacher / Form Master of an
              arm. Ask an Admin to assign you if this looks wrong.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  const armId = myArms.some((a) => a.id === params.arm) ? params.arm! : myArms[0].id;
  const selectedArm = myArms.find((a) => a.id === armId)!;

  const [broadsheet, conductRows] = await Promise.all([
    getBroadsheet(armId, currentTerm.id),
    getConductRatings(armId, currentTerm.id),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Class Teacher Ratings"
        description={`${selectedArm.label} — ${currentTerm.name} term`}
      />
      {myArms.length > 1 && <ArmSwitcher options={myArms} selectedId={armId} />}

      <Card>
        <CardHeader>
          <CardTitle>Consolidated Subject Scores</CardTitle>
        </CardHeader>
        <CardContent>
          {broadsheet.rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No subject scores recorded for this class yet.
            </p>
          ) : (
            <BroadsheetTable rows={broadsheet.rows} />
          )}
        </CardContent>
      </Card>

      <ClassRatingsForm key={armId} armId={armId} termId={currentTerm.id} students={conductRows} />
    </div>
  );
}
