'use client';

import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { updateStudent } from '@/lib/actions/students';

export function AddressForm({
  studentId,
  initialAddress,
}: {
  studentId: string;
  initialAddress: string | null;
}) {
  const [address, setAddress] = useState(initialAddress ?? '');
  const [lastSaved, setLastSaved] = useState(initialAddress ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const isDirty = address !== lastSaved;

  async function handleSave() {
    setIsSaving(true);
    try {
      await updateStudent(studentId, { address: address.trim() });
      setLastSaved(address);
      toast.success('Address updated.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't save your address.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <Textarea
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        placeholder="e.g. 12 Adeola Street, Ikeja, Lagos"
        className="min-h-16"
      />
      <div className="flex justify-end">
        <Button size="sm" onClick={() => void handleSave()} disabled={!isDirty || isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Saving…
            </>
          ) : (
            'Save Address'
          )}
        </Button>
      </div>
    </div>
  );
}
