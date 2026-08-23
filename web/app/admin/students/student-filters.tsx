'use client';

import { Search, X } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ENROLLMENT_STATUS_LABELS } from '@/lib/enrollment-status-labels';
import type { AcademicSessionDto, ClassDto } from '@/lib/types/academic';
import type { EnrollmentStatus } from '@/lib/types/students';

const STATUS_OPTIONS: EnrollmentStatus[] = [
  'ACTIVE',
  'PROMOTED',
  'REPEATED',
  'TRANSFERRED',
  'WITHDRAWN',
  'GRADUATED',
];

interface FilterValues {
  classId?: string;
  armId?: string;
  sessionId?: string;
  status?: EnrollmentStatus;
  search?: string;
  includeInactive?: boolean;
}

export function StudentFilters({
  classes,
  sessions,
  initial,
}: {
  classes: ClassDto[];
  sessions: AcademicSessionDto[];
  initial: FilterValues;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchInput, setSearchInput] = useState(initial.search ?? '');

  const selectedClass = classes.find((c) => c.id === initial.classId);
  const armsForSelectedClass = selectedClass?.arms ?? [];

  function updateParams(next: Partial<FilterValues>) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('page'); // any filter change resets to page 1
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, String(value));
      else params.delete(key);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  // Debounce the search box — 400ms after the user stops typing, not per keystroke.
  useEffect(() => {
    const handle = setTimeout(() => {
      if (searchInput !== (initial.search ?? '')) {
        updateParams({ search: searchInput || undefined });
      }
    }, 400);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const hasActiveFilters = Boolean(
    initial.classId ||
      initial.armId ||
      initial.sessionId ||
      initial.status ||
      initial.search ||
      initial.includeInactive,
  );

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="relative w-full max-w-xs">
        <Search
          className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search name or admission number…"
          className="pl-8"
          aria-label="Search students"
        />
      </div>

      <Select
        value={initial.classId ?? ''}
        onValueChange={(value) => updateParams({ classId: value || undefined, armId: undefined })}
        items={classes.map((klass) => ({ value: klass.id, label: klass.name }))}
      >
        <SelectTrigger className="w-40">
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

      <Select
        value={initial.armId ?? ''}
        disabled={!selectedClass}
        onValueChange={(value) => updateParams({ armId: value || undefined })}
        items={armsForSelectedClass.map((arm) => ({ value: arm.id, label: arm.name }))}
      >
        <SelectTrigger className="w-36">
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

      <Select
        value={initial.sessionId ?? ''}
        onValueChange={(value) => updateParams({ sessionId: value || undefined })}
        items={sessions.map((session) => ({ value: session.id, label: session.name }))}
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Session" />
        </SelectTrigger>
        <SelectContent>
          {sessions.map((session) => (
            <SelectItem key={session.id} value={session.id}>
              {session.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={initial.status ?? ''}
        onValueChange={(value) =>
          updateParams({ status: (value || undefined) as EnrollmentStatus | undefined })
        }
        items={STATUS_OPTIONS.map((status) => ({ value: status, label: ENROLLMENT_STATUS_LABELS[status] }))}
      >
        <SelectTrigger className="w-36">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((status) => (
            <SelectItem key={status} value={status}>
              {ENROLLMENT_STATUS_LABELS[status]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* A plain native <label> wrapping plain text — not the shadcn <Label>
          component, which is itself a <label>; nesting two <label>s is
          invalid HTML and can double-fire the checkbox toggle in some
          browsers. */}
      <label className="flex items-center gap-2 pb-1.5 text-sm">
        <Checkbox
          checked={initial.includeInactive ?? false}
          onCheckedChange={(checked) => updateParams({ includeInactive: checked === true })}
        />
        Show deactivated students
      </label>

      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setSearchInput('');
            router.push(pathname);
          }}
        >
          <X className="size-3.5" aria-hidden="true" />
          Clear filters
        </Button>
      )}
    </div>
  );
}
