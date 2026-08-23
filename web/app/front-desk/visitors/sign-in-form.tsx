'use client';

import { Loader2, LogIn } from 'lucide-react';
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
import { signInVisitor } from '@/lib/actions/front-desk';

export function SignInForm({
  staffOptions,
}: {
  staffOptions: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [reason, setReason] = useState('');
  const [hostStaffId, setHostStaffId] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  async function handleSignIn() {
    if (!name.trim() || !phone.trim() || !reason.trim()) {
      toast.error('Name, phone, and reason are all required.');
      return;
    }
    setIsSaving(true);
    try {
      await signInVisitor({
        name: name.trim(),
        phone: phone.trim(),
        reason: reason.trim(),
        hostStaffId: hostStaffId || undefined,
      });
      toast.success('Visitor signed in.');
      setName('');
      setPhone('');
      setReason('');
      setHostStaffId('');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't sign the visitor in.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-44 flex-1 space-y-1">
        <Label htmlFor="v-name">Name</Label>
        <Input id="v-name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="w-44 space-y-1">
        <Label htmlFor="v-phone">Phone</Label>
        <Input id="v-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+234…" />
      </div>
      <div className="min-w-48 flex-1 space-y-1">
        <Label htmlFor="v-reason">Reason</Label>
        <Input
          id="v-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Meeting the Bursar"
        />
      </div>
      <div className="w-52 space-y-1">
        <Label>Visiting (optional)</Label>
        <Select
          value={hostStaffId}
          onValueChange={(v) => setHostStaffId(v ?? '')}
          items={staffOptions.map((s) => ({ value: s.id, label: s.name }))}
        >
          <SelectTrigger className="w-full" aria-label="Host staff member">
            <SelectValue placeholder="Staff member…" />
          </SelectTrigger>
          <SelectContent>
            {staffOptions.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button onClick={() => void handleSignIn()} disabled={isSaving}>
        {isSaving ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <LogIn className="size-4" aria-hidden="true" />
        )}
        Sign In
      </Button>
    </div>
  );
}
