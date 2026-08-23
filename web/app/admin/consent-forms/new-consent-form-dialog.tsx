'use client';

import { Loader2, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { createConsentForm } from '@/lib/actions/clubs';
import { CONSENT_TYPE_LABELS } from '@/lib/consent-labels';
import type { ConsentFormType } from '@/lib/types/clubs';

const TYPE_OPTIONS = (Object.keys(CONSENT_TYPE_LABELS) as ConsentFormType[]).map((value) => ({
  value,
  label: CONSENT_TYPE_LABELS[value],
}));

export function NewConsentFormDialog({
  armOptions,
}: {
  armOptions: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<ConsentFormType>('EXCURSION');
  const [target, setTarget] = useState('WHOLE_SCHOOL');
  const [isSaving, setIsSaving] = useState(false);

  async function handleSend() {
    if (!title.trim()) return toast.error('A title is required.');
    if (!description.trim()) return toast.error('Describe what parents are consenting to.');
    setIsSaving(true);
    try {
      await createConsentForm({
        title: title.trim(),
        description: description.trim(),
        type,
        targetArmId: target === 'WHOLE_SCHOOL' ? undefined : target,
      });
      toast.success('Consent form sent — parents can now respond.');
      setOpen(false);
      setTitle('');
      setDescription('');
      setTarget('WHOLE_SCHOOL');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't send the form.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus className="size-4" aria-hidden="true" />
        New Consent Form
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New consent form</DialogTitle>
          <DialogDescription>
            Parents of the targeted students e-sign (consent or decline) from their portal.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cf-title">Title</Label>
            <Input
              id="cf-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Excursion to the National Museum"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cf-desc">Description</Label>
            <Textarea
              id="cf-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What, when, where — everything a parent needs to decide."
              className="min-h-24"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select
                value={type}
                onValueChange={(v) => {
                  if (v) setType(v as ConsentFormType);
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
            <div className="space-y-1.5">
              <Label>Send to</Label>
              <Select
                value={target}
                onValueChange={(v) => {
                  if (v) setTarget(v);
                }}
                items={[
                  { value: 'WHOLE_SCHOOL', label: 'Whole school' },
                  ...armOptions.map((a) => ({ value: a.id, label: a.label })),
                ]}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WHOLE_SCHOOL">Whole school</SelectItem>
                  {armOptions.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={() => void handleSend()} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Sending…
              </>
            ) : (
              'Send'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
