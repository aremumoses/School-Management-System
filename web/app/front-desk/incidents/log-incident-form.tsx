'use client';

import { Loader2, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { logFacilityIncident } from '@/lib/actions/front-desk';
import type { FacilityIncidentType } from '@/lib/types/front-desk';

const TYPE_OPTIONS: { value: FacilityIncidentType; label: string }[] = [
  { value: 'UNAUTHORIZED_ENTRY', label: 'Unauthorized Entry' },
  { value: 'ALTERCATION', label: 'Altercation' },
  { value: 'LOST_ITEM', label: 'Lost Item' },
  { value: 'OTHER', label: 'Other' },
];

export function LogIncidentForm() {
  const router = useRouter();
  const [type, setType] = useState<FacilityIncidentType>('OTHER');
  const [description, setDescription] = useState('');
  const [parties, setParties] = useState('');
  const [action, setAction] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  async function handleLog() {
    if (!description.trim()) return toast.error('Describe what happened.');
    setIsSaving(true);
    try {
      await logFacilityIncident({
        type,
        description: description.trim(),
        partiesInvolved: parties.trim() || undefined,
        actionTaken: action.trim() || undefined,
      });
      toast.success('Incident logged.');
      setType('OTHER');
      setDescription('');
      setParties('');
      setAction('');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't log the incident.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <Label>Type</Label>
          <Select
            value={type}
            onValueChange={(v) => {
              if (v) setType(v as FacilityIncidentType);
            }}
            items={TYPE_OPTIONS}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TYPE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="fi-parties">Parties involved (optional)</Label>
          <Input
            id="fi-parties"
            value={parties}
            onChange={(e) => setParties(e.target.value)}
            placeholder="e.g. Unknown man in a blue shirt; security guard Musa"
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="fi-desc">Description</Label>
        <Textarea
          id="fi-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What happened, where, and when."
          className="min-h-20"
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="fi-action">Action taken (optional)</Label>
        <Input
          id="fi-action"
          value={action}
          onChange={(e) => setAction(e.target.value)}
          placeholder="e.g. Escorted off the premises; Admin informed"
        />
      </div>

      <div className="flex justify-end">
        <Button size="sm" onClick={() => void handleLog()} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <Plus className="size-3.5" aria-hidden="true" />
          )}
          Log Incident
        </Button>
      </div>
    </div>
  );
}
