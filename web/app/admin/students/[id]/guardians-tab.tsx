'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Check, Copy, KeyRound, Plus } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { ConfirmDeleteButton } from '@/components/dashboard/confirm-delete-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { linkGuardian, unlinkGuardian } from '@/lib/actions/students';
import { resetGuardianPassword } from '@/lib/actions/guardians';
import type { GuardianDto, StudentDetailDto } from '@/lib/types/students';

const linkExistingSchema = z.object({
  guardianId: z.string().min(1, 'Choose a guardian'),
  relationship: z.string().min(1, 'Required').max(50),
});

const createNewSchema = z.object({
  firstName: z.string().min(1, 'Required').max(100),
  lastName: z.string().min(1, 'Required').max(100),
  email: z.string().email('Enter a valid email address'),
  phone: z.string().max(20).optional(),
  relationship: z.string().min(1, 'Required').max(50),
});

function ResetPasswordButton({ guardianId, name }: { guardianId: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, setIsPending] = useState(false);

  async function handleClick() {
    setOpen(true);
    setIsPending(true);
    try {
      const { temporaryPassword: pwd } = await resetGuardianPassword(guardianId);
      setTemporaryPassword(pwd);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to reset password.');
      setOpen(false);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setTemporaryPassword(null);
          setCopied(false);
        }
      }}
    >
      <Button variant="outline" size="sm" onClick={handleClick}>
        <KeyRound className="size-3.5" aria-hidden="true" />
        Invite / Resend Login
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New login for {name}</DialogTitle>
          <DialogDescription>
            Share this temporary password with them now — it won&apos;t be shown again.
          </DialogDescription>
        </DialogHeader>
        {isPending || !temporaryPassword ? (
          <p className="text-sm text-muted-foreground">Generating…</p>
        ) : (
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 p-3">
            <code className="flex-1 font-mono text-sm text-foreground">{temporaryPassword}</code>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                void navigator.clipboard.writeText(temporaryPassword);
                setCopied(true);
                toast.success('Copied to clipboard.');
              }}
            >
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
        )}
        <DialogFooter>
          <Button onClick={() => setOpen(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddGuardianDialog({
  studentId,
  allGuardians,
  alreadyLinkedIds,
}: {
  studentId: string;
  allGuardians: GuardianDto[];
  alreadyLinkedIds: string[];
}) {
  const [open, setOpen] = useState(false);
  const [newGuardianPassword, setNewGuardianPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const linkableGuardians = allGuardians.filter((g) => !alreadyLinkedIds.includes(g.id));

  const existingForm = useForm<z.infer<typeof linkExistingSchema>>({
    resolver: zodResolver(linkExistingSchema),
    defaultValues: { guardianId: '', relationship: '' },
  });
  const newForm = useForm<z.infer<typeof createNewSchema>>({
    resolver: zodResolver(createNewSchema),
    defaultValues: { firstName: '', lastName: '', email: '', phone: '', relationship: '' },
  });

  function closeAndReset() {
    setOpen(false);
    setNewGuardianPassword(null);
    setCopied(false);
    existingForm.reset();
    newForm.reset();
  }

  async function onLinkExisting(values: z.infer<typeof linkExistingSchema>) {
    try {
      await linkGuardian(studentId, values);
      toast.success('Guardian linked.');
      closeAndReset();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to link guardian.');
    }
  }

  async function onCreateNew(values: z.infer<typeof createNewSchema>) {
    try {
      const link = await linkGuardian(studentId, values);
      if (link.guardianTemporaryPassword) {
        // Shown once — never returned by the API again after this — so
        // stay open on a success view instead of closing immediately.
        setNewGuardianPassword(link.guardianTemporaryPassword);
      } else {
        toast.success('Guardian created and linked.');
        closeAndReset();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create guardian.');
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : closeAndReset())}>
      <DialogTrigger render={<Button />}>
        <Plus className="size-4" aria-hidden="true" />
        Add Guardian
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        {newGuardianPassword ? (
          <>
            <DialogHeader>
              <DialogTitle>Guardian created</DialogTitle>
              <DialogDescription>
                Share this temporary password with them now — it won&apos;t be shown again.
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 p-3">
              <code className="flex-1 font-mono text-sm text-foreground">
                {newGuardianPassword}
              </code>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  void navigator.clipboard.writeText(newGuardianPassword);
                  setCopied(true);
                  toast.success('Copied to clipboard.');
                }}
              >
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
            <DialogFooter>
              <Button onClick={closeAndReset}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Add a Guardian</DialogTitle>
              <DialogDescription>
                Link an existing guardian (e.g. a sibling already in the system) or create a new one.
              </DialogDescription>
            </DialogHeader>
            <Tabs defaultValue="existing">
          <TabsList>
            <TabsTrigger value="existing">Link Existing</TabsTrigger>
            <TabsTrigger value="new">Create New</TabsTrigger>
          </TabsList>
          <TabsContent value="existing" className="pt-3">
            <form
              onSubmit={existingForm.handleSubmit(onLinkExisting)}
              className="space-y-4"
              noValidate
            >
              <div className="space-y-2">
                <Label>Guardian</Label>
                <Select
                  value={existingForm.watch('guardianId')}
                  onValueChange={(v) => v && existingForm.setValue('guardianId', v)}
                  items={linkableGuardians.map((g) => ({
                    value: g.id,
                    label: `${g.firstName} ${g.lastName} (${g.email})`,
                  }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose a guardian…" />
                  </SelectTrigger>
                  <SelectContent>
                    {linkableGuardians.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.firstName} {g.lastName} ({g.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {existingForm.formState.errors.guardianId && (
                  <p className="flex items-center gap-1 text-sm text-destructive">
                    <AlertCircle className="size-3.5" aria-hidden="true" />
                    {existingForm.formState.errors.guardianId.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="existing-relationship">Relationship</Label>
                <Input
                  id="existing-relationship"
                  placeholder="Mother, Father, Uncle…"
                  {...existingForm.register('relationship')}
                />
                {existingForm.formState.errors.relationship && (
                  <p className="flex items-center gap-1 text-sm text-destructive">
                    <AlertCircle className="size-3.5" aria-hidden="true" />
                    {existingForm.formState.errors.relationship.message}
                  </p>
                )}
              </div>
              <DialogFooter>
                <Button type="submit" disabled={existingForm.formState.isSubmitting}>
                  {existingForm.formState.isSubmitting ? 'Linking…' : 'Link Guardian'}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>
          <TabsContent value="new" className="pt-3">
            <form onSubmit={newForm.handleSubmit(onCreateNew)} className="space-y-4" noValidate>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="new-firstName">First Name</Label>
                  <Input id="new-firstName" {...newForm.register('firstName')} />
                  {newForm.formState.errors.firstName && (
                    <p className="flex items-center gap-1 text-sm text-destructive">
                      <AlertCircle className="size-3.5" aria-hidden="true" />
                      {newForm.formState.errors.firstName.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-lastName">Last Name</Label>
                  <Input id="new-lastName" {...newForm.register('lastName')} />
                  {newForm.formState.errors.lastName && (
                    <p className="flex items-center gap-1 text-sm text-destructive">
                      <AlertCircle className="size-3.5" aria-hidden="true" />
                      {newForm.formState.errors.lastName.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="new-email">Email</Label>
                  <Input id="new-email" type="email" {...newForm.register('email')} />
                  {newForm.formState.errors.email && (
                    <p className="flex items-center gap-1 text-sm text-destructive">
                      <AlertCircle className="size-3.5" aria-hidden="true" />
                      {newForm.formState.errors.email.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-phone">Phone (optional)</Label>
                  <Input id="new-phone" placeholder="+2348012345678" {...newForm.register('phone')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-relationship">Relationship</Label>
                  <Input
                    id="new-relationship"
                    placeholder="Mother, Father, Uncle…"
                    {...newForm.register('relationship')}
                  />
                  {newForm.formState.errors.relationship && (
                    <p className="flex items-center gap-1 text-sm text-destructive">
                      <AlertCircle className="size-3.5" aria-hidden="true" />
                      {newForm.formState.errors.relationship.message}
                    </p>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={newForm.formState.isSubmitting}>
                  {newForm.formState.isSubmitting ? 'Creating…' : 'Create & Link'}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>
            </Tabs>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function GuardiansTab({
  student,
  allGuardians,
}: {
  student: StudentDetailDto;
  allGuardians: GuardianDto[];
}) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <AddGuardianDialog
          studentId={student.id}
          allGuardians={allGuardians}
          alreadyLinkedIds={student.guardians.map((g) => g.guardianId)}
        />
      </div>

      {student.guardians.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No guardians linked yet.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {student.guardians.map((link) => (
            <Card key={link.id}>
              <CardContent className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-foreground">
                      {link.guardian.firstName} {link.guardian.lastName}
                    </p>
                    <Badge variant="outline">{link.relationship}</Badge>
                  </div>
                  <ConfirmDeleteButton
                    itemLabel={`${link.guardian.firstName} ${link.guardian.lastName}`}
                    description="This unlinks the guardian from this student — their account isn't deleted."
                    onConfirm={() => unlinkGuardian(student.id, link.guardianId)}
                  />
                </div>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>{link.guardian.email}</p>
                  {link.guardian.phone && <p>{link.guardian.phone}</p>}
                </div>
                <ResetPasswordButton
                  guardianId={link.guardianId}
                  name={`${link.guardian.firstName} ${link.guardian.lastName}`}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
