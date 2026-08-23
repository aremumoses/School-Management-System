'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ClassDto } from '@/lib/types/academic';

const DAILY_VALUE = '__daily__';

export interface PeriodOption {
  classSubjectId: string;
  subjectName: string;
}

export function ClassRegisterFilters({
  classes,
  classId,
  armId,
  date,
  periodOptions,
  classSubjectId,
}: {
  classes: ClassDto[];
  classId: string;
  armId: string;
  date: string;
  periodOptions: PeriodOption[];
  classSubjectId?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const selectedClass = classes.find((c) => c.id === classId);
  const armsForSelectedClass = selectedClass?.arms ?? [];

  function navigate(
    nextClassId: string,
    nextArmId: string,
    nextDate: string,
    nextClassSubjectId?: string,
  ) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('registerClassId', nextClassId);
    params.set('registerArmId', nextArmId);
    params.set('registerDate', nextDate);
    if (nextClassSubjectId) params.set('registerPeriod', nextClassSubjectId);
    else params.delete('registerPeriod');
    router.push(`${pathname}?${params.toString()}`);
  }

  function handleClassChange(value: string | null) {
    if (!value) return;
    const newClass = classes.find((c) => c.id === value);
    // Changing class invalidates the previously-selected arm/period —
    // default to that class's first arm and the Daily register so it
    // doesn't go blank or carry over a period from the old class.
    navigate(value, newClass?.arms[0]?.id ?? '', date);
  }

  function handleArmChange(value: string | null) {
    if (!value) return;
    navigate(classId, value, date, classSubjectId);
  }

  function handleDateChange(value: string) {
    navigate(classId, armId, value, classSubjectId);
  }

  function handlePeriodChange(value: string | null) {
    if (!value) return;
    navigate(classId, armId, date, value === DAILY_VALUE ? undefined : value);
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1.5">
        <Label>Class</Label>
        <Select
          value={classId}
          onValueChange={handleClassChange}
          items={classes.map((klass) => ({ value: klass.id, label: klass.name }))}
        >
          <SelectTrigger className="w-36" aria-label="Class">
            <SelectValue placeholder="Class" />
          </SelectTrigger>
          <SelectContent>
            {classes.map((klass) => (
              <SelectItem key={klass.id} value={klass.id}>
                {klass.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Arm</Label>
        <Select
          value={armId}
          onValueChange={handleArmChange}
          disabled={!selectedClass}
          items={armsForSelectedClass.map((arm) => ({ value: arm.id, label: arm.name }))}
        >
          <SelectTrigger className="w-32" aria-label="Arm">
            <SelectValue placeholder="Arm" />
          </SelectTrigger>
          <SelectContent>
            {armsForSelectedClass.map((arm) => (
              <SelectItem key={arm.id} value={arm.id}>
                {arm.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="register-date">Date</Label>
        <Input
          id="register-date"
          type="date"
          className="w-40"
          value={date}
          onChange={(e) => handleDateChange(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Period</Label>
        <Select
          value={classSubjectId ?? DAILY_VALUE}
          onValueChange={handlePeriodChange}
          items={[
            { value: DAILY_VALUE, label: 'Daily Attendance' },
            ...periodOptions.map((p) => ({ value: p.classSubjectId, label: p.subjectName })),
          ]}
        >
          <SelectTrigger className="w-48" aria-label="Period">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={DAILY_VALUE}>Daily Attendance</SelectItem>
            {periodOptions.map((p) => (
              <SelectItem key={p.classSubjectId} value={p.classSubjectId}>
                {p.subjectName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
