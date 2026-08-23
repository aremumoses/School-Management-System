'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function ArmSwitcher({
  options,
  selectedId,
}: {
  options: { id: string; label: string }[];
  selectedId: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleChange(value: string | null) {
    if (!value) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set('arm', value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <Select
      value={selectedId}
      onValueChange={handleChange}
      items={options.map((o) => ({ value: o.id, label: o.label }))}
    >
      <SelectTrigger aria-label="Choose class">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.id} value={o.id}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
