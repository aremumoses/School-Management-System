'use client';

import { Plus } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { createVacancy } from '@/lib/actions/hr';

export function NewVacancyDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [closesAt, setClosesAt] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  function closeAndReset() {
    setOpen(false);
    setTitle('');
    setDescription('');
    setClosesAt('');
  }

  async function handleCreate() {
    if (!title.trim() || !description.trim()) {
      toast.error('Title and description are required.');
      return;
    }
    setIsSaving(true);
    try {
      await createVacancy({
        title: title.trim(),
        description: description.trim(),
        closesAt: closesAt || undefined,
      });
      toast.success('Vacancy posted.');
      closeAndReset();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't post this vacancy.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : closeAndReset())}>
      <DialogTrigger render={<Button />}>
        <Plus className="size-4" aria-hidden="true" />
        Post Vacancy
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Post a Vacancy</DialogTitle>
          <DialogDescription>
            Candidates can apply against the link shared once this vacancy is posted.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="vacancy-title">Title</Label>
            <Input
              id="vacancy-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Mathematics Teacher"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vacancy-description">Description</Label>
            <Textarea
              id="vacancy-description"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Role responsibilities, requirements, qualifications…"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vacancy-closes">Closes On (optional)</Label>
            <Input
              id="vacancy-closes"
              type="date"
              value={closesAt}
              onChange={(e) => setClosesAt(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => void handleCreate()} disabled={isSaving}>
            {isSaving ? 'Posting…' : 'Post Vacancy'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
