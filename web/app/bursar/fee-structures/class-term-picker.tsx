'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { FormFieldLabel } from '@/components/dashboard/form-field-label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ClassDto } from '@/lib/types/academic';
import type { TermOption } from './page';

export function ClassTermPicker({
  classes,
  terms,
  selectedClassId,
  selectedTermId,
}: {
  classes: ClassDto[];
  terms: TermOption[];
  selectedClassId?: string;
  selectedTermId?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function update(key: 'classId' | 'termId', value: string | null) {
    if (!value) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="grid gap-4 rounded-xl bg-card p-4 sm:flex sm:flex-wrap sm:items-end sm:p-5 dark:ring-1 dark:ring-foreground/10">
      <div className="space-y-2">
        <FormFieldLabel>Class</FormFieldLabel>
        <Select
          value={selectedClassId}
          onValueChange={(value) => update('classId', value)}
          items={classes.map((c) => ({ value: c.id, label: c.name }))}
        >
          <SelectTrigger className="w-full data-[size=default]:h-10 sm:w-48" aria-label="Choose class">
            <SelectValue placeholder="Choose a class…" />
          </SelectTrigger>
          <SelectContent>
            {classes.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <FormFieldLabel>Term</FormFieldLabel>
        <Select
          value={selectedTermId}
          onValueChange={(value) => update('termId', value)}
          items={terms.map((t) => ({ value: t.id, label: `${t.name} Term — ${t.sessionName}` }))}
        >
          <SelectTrigger className="w-full data-[size=default]:h-10 sm:w-72" aria-label="Choose term">
            <SelectValue placeholder="Choose a term…" />
          </SelectTrigger>
          <SelectContent>
            {terms.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name} Term — {t.sessionName}
                {t.isCurrent ? ' (current)' : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
