'use client';

import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

const OPTIONS = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'RETURNED', label: 'Returned' },
  { value: 'ALL', label: 'All' },
];

/** Akademi's pill strip — the same look as `<TabsList variant="pill">`. */
export function StatusFilter({ selected }: { selected: string }) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div
      role="group"
      aria-label="Filter by status"
      className="inline-flex flex-wrap gap-1 rounded-xl bg-card p-1.5 dark:ring-1 dark:ring-foreground/10"
    >
      {OPTIONS.map((option) => {
        const isActive = selected === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isActive}
            onClick={() => router.push(`${pathname}?status=${option.value}`)}
            className={cn(
              'h-9 rounded-lg px-4 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
              isActive
                ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-foreground'
                : 'text-muted-foreground hover:bg-primary/5 hover:text-heading',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
