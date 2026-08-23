'use client';

import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createLeaveType } from '@/lib/actions/hr';
import type { LeaveTypeDto } from '@/lib/types/hr';

export function LeaveTypesManager({ leaveTypes }: { leaveTypes: LeaveTypeDto[] }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [defaultAnnualDays, setDefaultAnnualDays] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  async function handleCreate() {
    if (!name.trim() || !defaultAnnualDays) {
      toast.error('Name and default days are required.');
      return;
    }
    setIsSaving(true);
    try {
      await createLeaveType({ name: name.trim(), defaultAnnualDays: Number(defaultAnnualDays) });
      toast.success('Leave type added.');
      setName('');
      setDefaultAnnualDays('');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't add this leave type.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Leave Types</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {leaveTypes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No leave types defined yet.</p>
          ) : (
            leaveTypes.map((t) => (
              <span
                key={t.id}
                className="rounded-full border border-border px-3 py-1 text-xs text-foreground"
              >
                {t.name} · {t.defaultAnnualDays} days/yr
              </span>
            ))
          )}
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1.5">
            <Label htmlFor="leave-type-name">Name</Label>
            <Input
              id="leave-type-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Annual, Sick, Maternity…"
              className="w-48"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="leave-type-days">Default Days/Year</Label>
            <Input
              id="leave-type-days"
              type="number"
              min="0"
              value={defaultAnnualDays}
              onChange={(e) => setDefaultAnnualDays(e.target.value)}
              className="w-32"
            />
          </div>
          <Button onClick={() => void handleCreate()} disabled={isSaving}>
            <Plus className="size-4" aria-hidden="true" />
            Add
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
