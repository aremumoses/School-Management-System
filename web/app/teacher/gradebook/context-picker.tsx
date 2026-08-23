'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';

export function ContextPicker({
  options,
  selectedId,
  threshold,
}: {
  options: { classSubjectId: string; label: string }[];
  selectedId: string;
  threshold: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function update(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1.5">
        <Label>Class / Subject</Label>
        <Select
          value={selectedId}
          onValueChange={(v) => update('context', v)}
          items={options.map((o) => ({ value: o.classSubjectId, label: o.label }))}
        >
          <SelectTrigger className="w-full sm:w-72" aria-label="Choose class and subject">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((o) => (
              <SelectItem key={o.classSubjectId} value={o.classSubjectId}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="threshold">At-risk threshold (%)</Label>
        <Input
          id="threshold"
          type="number"
          min="0"
          max="100"
          defaultValue={threshold}
          onBlur={(e) => update('threshold', e.target.value || null)}
          className="w-28"
        />
      </div>
    </div>
  );
}
