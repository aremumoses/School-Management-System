import { CalendarClock } from 'lucide-react';
import { PageHeader } from '@/components/dashboard/page-header';
import { SCHOOL_DAYS } from '@/components/timetable/week-grid';
import { getArmTimetable, listPeriods } from '@/lib/actions/timetable';
import { apiFetch } from '@/lib/api';
import type { ClassDto, SubjectDto, TermDto } from '@/lib/types/academic';
import { ArmPicker } from './arm-picker';
import { PeriodsManager } from './periods-manager';
import { TimetableBuilder } from './timetable-builder';

function PageNotice({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl bg-card px-6 py-10 text-center text-sm text-muted-foreground dark:ring-1 dark:ring-foreground/10">
      {children}
    </p>
  );
}

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
        <PageNotice>Set a current term first.</PageNotice>
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

  const totalSlots = (grid?.periods.length ?? 0) * SCHOOL_DAYS.length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Timetable Builder"
        description={`${currentTerm.name} term. Click a cell to schedule — double-bookings (class, teacher, or room) are rejected with the exact clash named.`}
      />

      <PeriodsManager periods={periods} />

      {armOptions.length === 0 ? (
        <PageNotice>Create classes and arms in Academic Setup first.</PageNotice>
      ) : (
        <section className="overflow-hidden rounded-xl bg-card dark:ring-1 dark:ring-foreground/10">
          <div className="flex flex-col gap-4 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5">
            <div className="flex min-w-0 items-center gap-4">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <CalendarClock className="size-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-heading">Weekly Schedule</h2>
                <p className="text-sm text-muted-foreground">
                  {selectedArm!.label}
                  {totalSlots > 0 && ` · ${grid!.entries.length} of ${totalSlots} slots filled`}
                </p>
              </div>
            </div>
            <ArmPicker options={armOptions} selectedId={selectedArm!.id} />
          </div>

          {periods.length === 0 ? (
            <div className="p-5 sm:p-6">
              <p className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
                Add the school&apos;s periods above before building the grid.
              </p>
            </div>
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
        </section>
      )}
    </div>
  );
}
