'use client';

import { Loader2, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { ConfirmDeleteButton } from '@/components/dashboard/confirm-delete-button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { addPickupPerson, removePickupPerson } from '@/lib/actions/front-desk';
import type { PickupPersonDto } from '@/lib/types/front-desk';

export function PickupPersonsManager({
  studentId,
  persons,
}: {
  studentId: string;
  persons: PickupPersonDto[];
}) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  async function handleAdd() {
    if (!name.trim() || !phone.trim() || !relationship.trim()) {
      toast.error('Name, phone, and relationship are all required.');
      return;
    }
    setIsAdding(true);
    try {
      await addPickupPerson(studentId, {
        name: name.trim(),
        phone: phone.trim(),
        relationship: relationship.trim(),
      });
      toast.success('Pickup person added.');
      setName('');
      setPhone('');
      setRelationship('');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't add the person.");
    } finally {
      setIsAdding(false);
    }
  }

  return (
    <div className="space-y-4">
      {persons.length === 0 ? (
        <p className="py-2 text-sm text-muted-foreground">
          No one is on the list yet — only you can collect your child until you add someone.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {persons.map((person) => (
            <li key={person.id} className="flex items-center justify-between px-4 py-2.5">
              <div>
                <p className="text-sm font-medium text-foreground">{person.name}</p>
                <p className="text-xs text-muted-foreground">
                  {person.relationship} · {person.phone}
                </p>
              </div>
              <ConfirmDeleteButton
                itemLabel={person.name}
                description={`${person.name} will no longer be allowed to collect your child at the gate. This takes effect immediately.`}
                onConfirm={async () => {
                  await removePickupPerson(studentId, person.id);
                  toast.success('Removed from the pickup list.');
                  router.refresh();
                }}
              />
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-end gap-3 border-t border-border pt-4">
        <div className="min-w-44 flex-1 space-y-1">
          <Label htmlFor="pp-name">Full name (as on their ID)</Label>
          <Input
            id="pp-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Femi Adewale"
          />
        </div>
        <div className="w-44 space-y-1">
          <Label htmlFor="pp-phone">Phone</Label>
          <Input
            id="pp-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+234…"
          />
        </div>
        <div className="w-36 space-y-1">
          <Label htmlFor="pp-rel">Relationship</Label>
          <Input
            id="pp-rel"
            value={relationship}
            onChange={(e) => setRelationship(e.target.value)}
            placeholder="e.g. Uncle"
          />
        </div>
        <Button size="sm" onClick={() => void handleAdd()} disabled={isAdding}>
          {isAdding ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <Plus className="size-3.5" aria-hidden="true" />
          )}
          Add
        </Button>
      </div>
    </div>
  );
}
