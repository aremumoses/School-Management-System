'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface TermOption {
  id: string;
  name: string;
  sessionName: string;
  isCurrent: boolean;
}

export function TermPicker({ terms, selectedTermId }: { terms: TermOption[]; selectedTermId?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function update(value: string | null) {
    if (!value) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set('termId', value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="space-y-1.5 print:hidden">
      <Label>Term</Label>
      <Select
        value={selectedTermId}
        onValueChange={update}
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
  );
}
