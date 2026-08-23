'use client';

import { Loader2, Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { createEvent } from '@/lib/actions/calendar';

const CATEGORY_SUGGESTIONS = ['PTA Meeting', 'Holiday', 'Exam', 'Sports', 'Assembly'];

export function CreateEventDialog({ onCreated }: { onCreated?: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [description, setDescription] = useState('');
  const [rsvpEnabled, setRsvpEnabled] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  function reset() {
    setTitle('');
    setCategory('');
    setStartDate('');
    setEndDate('');
    setDescription('');
    setRsvpEnabled(false);
  }

  async function submit() {
    if (!title.trim() || !category.trim() || !startDate) {
      toast.error('Title, category, and a start date/time are all required.');
      return;
    }
    if (endDate && new Date(endDate) < new Date(startDate)) {
      toast.error('The end date/time can’t be before the start.');
      return;
    }
    setIsSaving(true);
    try {
      await createEvent({
        title: title.trim(),
        category: category.trim(),
        startDate: new Date(startDate).toISOString(),
        endDate: endDate ? new Date(endDate).toISOString() : undefined,
        description: description.trim() || undefined,
        rsvpEnabled,
      });
      toast.success('Event created.');
      reset();
      setOpen(false);
      onCreated?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't create the event.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm">
            <Plus className="size-4" aria-hidden="true" />
            New Event
          </Button>
        }
      />
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create a Calendar Event</DialogTitle>
          <DialogDescription>
            Visible to every role on the calendar. Mark something a &ldquo;Holiday&rdquo; category to
            have it stand out distinctly from regular events.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="event-title">Title</Label>
            <Input id="event-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="event-category">Category</Label>
            <Input
              id="event-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. PTA Meeting"
              list="event-category-suggestions"
            />
            <datalist id="event-category-suggestions">
              {CATEGORY_SUGGESTIONS.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="event-start">Starts</Label>
              <Input
                id="event-start"
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="event-end">Ends (optional)</Label>
              <Input
                id="event-end"
                type="datetime-local"
                value={endDate}
                min={startDate || undefined}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="event-description">Description</Label>
            <Textarea
              id="event-description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <Label htmlFor="event-rsvp" className="font-normal">
                Enable RSVP
              </Label>
              <p className="text-xs text-muted-foreground">
                Staff and guardians can respond Going/Maybe/Can&apos;t go.
              </p>
            </div>
            <Switch id="event-rsvp" checked={rsvpEnabled} onCheckedChange={setRsvpEnabled} />
          </div>
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" type="button" />}>Cancel</DialogClose>
          <Button type="button" disabled={isSaving} onClick={submit}>
            {isSaving ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : 'Create Event'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
