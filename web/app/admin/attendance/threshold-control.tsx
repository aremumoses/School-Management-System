'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const THRESHOLD_OPTIONS = [10, 15, 20, 25, 30];

export function ThresholdControl({ threshold }: { threshold: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleChange(value: string | null) {
    if (!value) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set('threshold', value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <Select
      value={String(threshold)}
      onValueChange={handleChange}
      items={THRESHOLD_OPTIONS.map((option) => ({ value: String(option), label: `Above ${option}%` }))}
    >
      <SelectTrigger size="sm" aria-label="Absence rate threshold">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {THRESHOLD_OPTIONS.map((option) => (
          <SelectItem key={option} value={String(option)}>
            Above {option}%
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
