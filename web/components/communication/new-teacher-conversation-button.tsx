'use client';

import { Loader2, Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { createConversation } from '@/lib/actions/communication';
import type { MyTeacherDto } from '@/lib/types/communication';

/** Student-side "start a new thread" — only their own teachers are offered (and the backend re-checks). */
export function NewTeacherConversationButton({
  teacherOptions,
  onCreated,
}: {
  teacherOptions: MyTeacherDto[];
  onCreated: (conversationId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [staffId, setStaffId] = useState('');
  const [message, setMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  async function handleCreate() {
    if (!staffId) {
      toast.error('Choose a teacher first.');
      return;
    }
    if (!message.trim()) {
      toast.error('Write a message to start the thread.');
      return;
    }
    setIsSaving(true);
    try {
      const conversation = await createConversation({ staffId, message: message.trim() });
      setOpen(false);
      setStaffId('');
      setMessage('');
      onCreated(conversation.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't start the conversation.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        <Plus className="size-3.5" aria-hidden="true" />
        New
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Message a teacher</DialogTitle>
          <DialogDescription>
            You can message your class teacher and the teachers who take your subjects.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Teacher</Label>
            <Select
              value={staffId}
              onValueChange={(v) => {
                if (v) setStaffId(v);
              }}
              items={teacherOptions.map((t) => ({
                value: t.staffId,
                label: `${t.name} — ${t.label}`,
              }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a teacher…" />
              </SelectTrigger>
              <SelectContent>
                {teacherOptions.map((t) => (
                  <SelectItem key={t.staffId} value={t.staffId}>
                    {t.name} — {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {teacherOptions.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No teachers found for your class this term.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="first-message">Message</Label>
            <Textarea
              id="first-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="e.g. Good afternoon sir, I have a question about today's homework…"
              className="min-h-20"
            />
          </div>

          <div className="flex justify-end">
            <Button onClick={() => void handleCreate()} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Sending…
                </>
              ) : (
                'Send'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
