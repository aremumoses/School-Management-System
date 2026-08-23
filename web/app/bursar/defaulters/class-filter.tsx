'use client';

import { X } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ClassDto } from '@/lib/types/academic';

export function ClassFilter({
  classes,
  selectedClassId,
}: {
  classes: ClassDto[];
  selectedClassId?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function update(value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set('classId', value);
    else params.delete('classId');
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex items-end gap-2">
      <div className="space-y-1.5">
        <Label>Class</Label>
        <Select
          value={selectedClassId}
          onValueChange={update}
          items={classes.map((c) => ({ value: c.id, label: c.name }))}
        >
          <SelectTrigger className="w-48" aria-label="Filter by class">
            <SelectValue placeholder="All classes" />
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
      {selectedClassId && (
        <Button variant="ghost" size="sm" onClick={() => update(null)}>
          <X className="size-4" aria-hidden="true" />
          Clear filter
        </Button>
      )}
    </div>
  );
}
