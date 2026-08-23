'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { updateEnabledModules } from '@/lib/actions/admin';

const MODULES = [
  {
    id: 'HOSTEL',
    label: 'Hostel Management',
    description: 'Boarding, bed assignments, and warden records.',
  },
  {
    id: 'TRANSPORT',
    label: 'Transport Management',
    description: 'Bus routes, vehicle tracking, and student transport lists.',
  },
  {
    id: 'LIBRARY',
    label: 'Library',
    description: 'Book catalogue, issues, returns, and overdue tracking.',
  },
  {
    id: 'CBT',
    label: 'CBT Engine',
    description: 'Computer-based testing — question banks, exams, and auto-marking.',
  },
] as const;

type ModuleId = (typeof MODULES)[number]['id'];

export function ModuleToggles({ initialModules }: { initialModules: string[] }) {
  const [enabled, setEnabled] = useState<Set<string>>(new Set(initialModules));
  const [isPending, startTransition] = useTransition();

  function toggle(id: ModuleId) {
    const next = new Set(enabled);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setEnabled(next);
    startTransition(async () => {
      try {
        await updateEnabledModules([...next]);
        toast.success('Module settings saved.');
      } catch {
        toast.error('Failed to save module settings.');
        // Revert optimistic update
        setEnabled(enabled);
      }
    });
  }

  return (
    <div className="divide-y divide-border rounded-lg border border-border">
      {MODULES.map(({ id, label, description }) => (
        <div key={id} className="flex items-center justify-between gap-4 px-4 py-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">{label}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
          <Switch
            checked={enabled.has(id)}
            onCheckedChange={() => toggle(id)}
            disabled={isPending}
            aria-label={`Toggle ${label}`}
          />
        </div>
      ))}
    </div>
  );
}
