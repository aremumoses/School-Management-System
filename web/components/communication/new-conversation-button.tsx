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
import { getStudentDetail } from '@/lib/actions/students';

interface StudentOption {
  id: string;
  name: string;
}

interface GuardianOption {
  id: string;
  name: string;
}

/** Teacher-side "start a new thread" — docs §6 is staff-initiated only. */
export function NewConversationButton({
  studentOptions,
  onCreated,
}: {
  studentOptions: StudentOption[];
  onCreated: (conversationId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [studentId, setStudentId] = useState('');
  const [guardianOptions, setGuardianOptions] = useState<GuardianOption[]>([]);
  const [guardianId, setGuardianId] = useState('');
  const [isLoadingGuardians, setIsLoadingGuardians] = useState(false);
  const [message, setMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  async function handleStudentChange(id: string) {
    setStudentId(id);
    setGuardianId('');
    setGuardianOptions([]);
    setIsLoadingGuardians(true);
    try {
      const detail = await getStudentDetail(id);
      setGuardianOptions(
        detail.guardians.map((g) => ({
          id: g.guardianId,
          name: `${g.guardian.firstName} ${g.guardian.lastName} (${g.relationship})`,
        })),
      );
    } catch {
      toast.error("Couldn't load this student's guardians.");
    } finally {
      setIsLoadingGuardians(false);
    }
  }

  async function handleCreate() {
    if (!studentId || !guardianId || !message.trim()) return;
    setIsSaving(true);
    try {
      const conversation = await createConversation({ studentId, guardianId, message });
      toast.success('Conversation started.');
      setOpen(false);
      setStudentId('');
      setGuardianId('');
      setGuardianOptions([]);
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
      <DialogTrigger
        render={
          <Button size="sm">
            <Plus className="size-4" aria-hidden="true" />
            New
          </Button>
        }
      />
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Start a conversation</DialogTitle>
          <DialogDescription>Pick a student, then which guardian to message.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Student</Label>
            <Select
              value={studentId}
              onValueChange={(v) => v && handleStudentChange(v)}
              items={studentOptions.map((s) => ({ value: s.id, label: s.name }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a student" />
              </SelectTrigger>
              <SelectContent>
                {studentOptions.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {studentId && (
            <div className="space-y-1.5">
              <Label>Guardian</Label>
              {isLoadingGuardians ? (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                  Loading…
                </p>
              ) : guardianOptions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No guardian on file for this student.</p>
              ) : (
                <Select
                  value={guardianId}
                  onValueChange={(v) => v && setGuardianId(v)}
                  items={guardianOptions.map((g) => ({ value: g.id, label: g.name }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a guardian" />
                  </SelectTrigger>
                  <SelectContent>
                    {guardianOptions.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="new-conversation-message">Message</Label>
            <Textarea
              id="new-conversation-message"
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write your first message…"
            />
          </div>

          <Button
            className="w-full"
            disabled={!studentId || !guardianId || !message.trim() || isSaving}
            onClick={handleCreate}
          >
            {isSaving ? 'Starting…' : 'Start conversation'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
