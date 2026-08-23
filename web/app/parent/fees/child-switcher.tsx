'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface ChildOption {
  id: string;
  label: string;
}

export function ChildSwitcher({ options, selectedId }: { options: ChildOption[]; selectedId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleChange(value: string | null) {
    if (!value) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set('studentId', value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <Select
      value={selectedId}
      onValueChange={handleChange}
      items={options.map((child) => ({ value: child.id, label: child.label }))}
    >
      <SelectTrigger aria-label="Choose child">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((child) => (
          <SelectItem key={child.id} value={child.id}>
            {child.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
