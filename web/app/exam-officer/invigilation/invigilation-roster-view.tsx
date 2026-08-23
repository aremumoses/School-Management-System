'use client';

import { Loader2, Plus, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { assignInvigilator, removeInvigilator } from '@/lib/actions/exam-logistics';
import type { StaffDto } from '@/lib/types/staff';
import type { InvigilationRole, RosterSessionDto } from '@/lib/types/exam-logistics';

function AssignRow({
  session,
  staff,
  dutyLoad,
  onChanged,
}: {
  session: RosterSessionDto;
  staff: StaffDto[];
  dutyLoad: Map<string, number>;
  onChanged: () => void;
}) {
  const [staffId, setStaffId] = useState('');
  const [role, setRole] = useState<InvigilationRole>('LEAD');
  const [isSaving, setIsSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const assignedIds = new Set(session.invigilators.map((i) => i.staffId));
  const staffOptions = staff.filter((s) => !assignedIds.has(s.id));

  async function handleAssign() {
    if (!staffId) return toast.error('Choose a staff member.');
    setIsSaving(true);
    try {
      await assignInvigilator(session.examSessionId, { staffId, role });
      toast.success('Invigilator assigned and notified.');
      setStaffId('');
      onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't assign this invigilator.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRemove(removeStaffId: string) {
    setRemovingId(removeStaffId);
    try {
      await removeInvigilator(session.examSessionId, removeStaffId);
      onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't remove this invigilator.");
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-3 py-3">
        <div>
          <p className="font-medium text-foreground">
            {session.subjectName} — {session.armLabel}
          </p>
          <p className="text-xs text-muted-foreground">
            {new Date(session.date).toLocaleDateString(undefined, {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })}{' '}
            · {session.startTime} · {session.durationMinutes} min
          </p>
        </div>

        {session.invigilators.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {session.invigilators.map((inv) => (
              <Badge key={inv.staffId} variant={inv.role === 'LEAD' ? 'default' : 'outline'}>
                {inv.staffName} ({inv.role === 'LEAD' ? 'Lead' : 'Assistant'})
                <button
                  type="button"
                  onClick={() => void handleRemove(inv.staffId)}
                  disabled={removingId === inv.staffId}
                  aria-label={`Remove ${inv.staffName}`}
                  className="ml-1 inline-flex"
                >
                  {removingId === inv.staffId ? (
                    <Loader2 className="size-3 animate-spin" aria-hidden="true" />
                  ) : (
                    <X className="size-3" aria-hidden="true" />
                  )}
                </button>
              </Badge>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={staffId}
            onValueChange={(v) => setStaffId(v ?? '')}
            items={staffOptions.map((s) => ({
              value: s.id,
              label: `${s.firstName} ${s.lastName} — ${dutyLoad.get(s.id) ?? 0} duties`,
            }))}
          >
            <SelectTrigger className="h-8 w-64 text-xs">
              <SelectValue placeholder="Add invigilator…" />
            </SelectTrigger>
            <SelectContent>
              {staffOptions.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.firstName} {s.lastName} — {dutyLoad.get(s.id) ?? 0} duties this period
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={role}
            onValueChange={(v) => {
              if (v) setRole(v as InvigilationRole);
            }}
            items={[
              { value: 'LEAD', label: 'Lead' },
              { value: 'ASSISTANT', label: 'Assistant' },
            ]}
          >
            <SelectTrigger className="h-8 w-28 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="LEAD">Lead</SelectItem>
              <SelectItem value="ASSISTANT">Assistant</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => void handleAssign()} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Plus className="size-3.5" aria-hidden="true" />
            )}
            Assign
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function InvigilationRosterView({
  roster,
  staff,
}: {
  roster: RosterSessionDto[];
  staff: StaffDto[];
}) {
  const router = useRouter();

  const dutyLoad = useMemo(() => {
    const map = new Map<string, number>();
    for (const session of roster) {
      for (const inv of session.invigilators) {
        map.set(inv.staffId, (map.get(inv.staffId) ?? 0) + 1);
      }
    }
    return map;
  }, [roster]);

  const sorted = useMemo(
    () =>
      [...roster].sort(
        (a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime),
      ),
    [roster],
  );

  // The server action already revalidates the route's cache; router.refresh()
  // re-renders this Server Component subtree so `roster` (and each row's
  // "already assigned" set / duty-load counts) reflects the new data.
  function handleChanged() {
    router.refresh();
  }

  if (sorted.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
        No exam sessions scheduled yet — build the exam timetable first.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {sorted.map((session) => (
        <AssignRow
          key={session.examSessionId}
          session={session}
          staff={staff}
          dutyLoad={dutyLoad}
          onChanged={handleChanged}
        />
      ))}
    </div>
  );
}
