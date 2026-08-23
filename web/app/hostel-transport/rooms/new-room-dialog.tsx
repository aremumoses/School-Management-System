'use client';

import { Loader2, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createRoom } from '@/lib/actions/hostel-transport';

export function NewRoomDialog({ hostelId }: { hostelId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [roomNumber, setRoomNumber] = useState('');
  const [bedCapacity, setBedCapacity] = useState('4');
  const [isSaving, setIsSaving] = useState(false);

  async function handleCreate() {
    if (!roomNumber.trim()) return toast.error('A room number is required.');
    setIsSaving(true);
    try {
      await createRoom({
        hostelId,
        roomNumber: roomNumber.trim(),
        bedCapacity: Number(bedCapacity) || 1,
      });
      toast.success('Room added.');
      setRoomNumber('');
      setBedCapacity('4');
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't add this room.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="size-4" aria-hidden="true" />
        New Room
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add a room</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="room-number">Room number</Label>
            <Input
              id="room-number"
              value={roomNumber}
              onChange={(e) => setRoomNumber(e.target.value)}
              placeholder="12"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="room-capacity">Bed capacity</Label>
            <Input
              id="room-capacity"
              type="number"
              min="1"
              value={bedCapacity}
              onChange={(e) => setBedCapacity(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={() => void handleCreate()} disabled={isSaving}>
            {isSaving ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : 'Add'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
