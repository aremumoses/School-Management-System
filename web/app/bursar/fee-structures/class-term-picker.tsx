'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Label } from '@/components/ui/label';
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
    <div className="flex flex-wrap gap-4">
      <div className="space-y-1.5">
        <Label>Class</Label>
        <Select
          value={selectedClassId}
          onValueChange={(value) => update('classId', value)}
          items={classes.map((c) => ({ value: c.id, label: c.name }))}
        >
          <SelectTrigger className="w-48" aria-label="Choose class">
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
      <div className="space-y-1.5">
        <Label>Term</Label>
        <Select
          value={selectedTermId}
          onValueChange={(value) => update('termId', value)}
          items={terms.map((t) => ({ value: t.id, label: `${t.name} Term — ${t.sessionName}` }))}
        >
          <SelectTrigger className="w-64" aria-label="Choose term">
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
