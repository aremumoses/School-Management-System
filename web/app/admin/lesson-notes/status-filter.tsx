'use client';

import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

const OPTIONS = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'RETURNED', label: 'Returned' },
  { value: 'ALL', label: 'All' },
];

export function StatusFilter({ selected }: { selected: string }) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="flex flex-wrap gap-1">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => router.push(`${pathname}?status=${option.value}`)}
          className={cn(
            'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            selected === option.value
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
