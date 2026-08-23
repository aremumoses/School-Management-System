import { PageHeader } from '@/components/dashboard/page-header';
import { getArmTimetable, listPeriods } from '@/lib/actions/timetable';
import { apiFetch } from '@/lib/api';
import type { ClassDto, SubjectDto, TermDto } from '@/lib/types/academic';
import { ArmPicker } from './arm-picker';
import { PeriodsManager } from './periods-manager';
import { TimetableBuilder } from './timetable-builder';

export default async function AdminTimetablePage({
  searchParams,
}: {
  searchParams: Promise<{ arm?: string }>;
}) {
  const params = await searchParams;

  const [classes, subjects, currentTerm, periods] = await Promise.all([
    apiFetch<ClassDto[]>('/classes'),
    apiFetch<SubjectDto[]>('/subjects'),
    apiFetch<TermDto>('/terms/current').catch(() => null),
    listPeriods(),
  ]);

  const armOptions = classes.flatMap((klass) =>
    klass.arms.map((arm) => ({
      id: arm.id,
      classId: klass.id,
      label: `${klass.name} ${arm.name}`,
    })),
  );

  if (!currentTerm) {
    return (
      <div className="space-y-6">
        <PageHeader title="Timetable Builder" />
        <p className="text-sm text-muted-foreground">Set a current term first.</p>
      </div>
    );
  }

  const selectedArm = armOptions.find((a) => a.id === params.arm) ?? armOptions[0];

  const grid = selectedArm
    ? await getArmTimetable(selectedArm.id, currentTerm.id)
    : null;

  // Subjects mapped to the selected arm's class — the cell dialog's options.
  const classSubjectOptions = selectedArm
    ? subjects
        .flatMap((subject) =>
          subject.classSubjects
            .filter((cs) => cs.classId === selectedArm.classId)
            .map((cs) => ({ id: cs.id, label: subject.name })),
        )
        .sort((a, b) => a.label.localeCompare(b.label))
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Timetable Builder"
        description={`${currentTerm.name} term. Click a cell to schedule — double-bookings (class, teacher, or room) are rejected with the exact clash named.`}
      />

      <PeriodsManager periods={periods} />

      {armOptions.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Create classes and arms in Academic Setup first.
        </p>
      ) : (
        <>
          <ArmPicker options={armOptions} selectedId={selectedArm!.id} />
          {periods.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Add the school&apos;s periods above before building the grid.
            </p>
          ) : (
            grid && (
              <TimetableBuilder
                key={selectedArm!.id}
                armId={selectedArm!.id}
                armLabel={selectedArm!.label}
                termId={currentTerm.id}
                periods={grid.periods}
                entries={grid.entries}
                classSubjectOptions={classSubjectOptions}
              />
            )
          )}
        </>
      )}
    </div>
  );
}
