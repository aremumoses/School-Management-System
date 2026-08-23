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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createRoute } from '@/lib/actions/hostel-transport';
import type { TransportStaffRecordDto } from '@/lib/types/hostel-transport';

export function NewRouteDialog({ staff }: { staff: TransportStaffRecordDto[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [busIdentifier, setBusIdentifier] = useState('');
  const [driverId, setDriverId] = useState('');
  const [conductorId, setConductorId] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const drivers = staff.filter((s) => s.role === 'DRIVER');
  const conductors = staff.filter((s) => s.role === 'CONDUCTOR');

  async function handleCreate() {
    if (!name.trim() || !busIdentifier.trim()) {
      return toast.error('Name and bus identifier are both required.');
    }
    setIsSaving(true);
    try {
      await createRoute({
        name: name.trim(),
        busIdentifier: busIdentifier.trim(),
        driverId: driverId || undefined,
        conductorId: conductorId || undefined,
      });
      toast.success('Route added.');
      setName('');
      setBusIdentifier('');
      setDriverId('');
      setConductorId('');
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't add this route.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus className="size-4" aria-hidden="true" />
        New Route
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a route</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="route-name">Name</Label>
              <Input id="route-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Route A" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="route-bus">Bus identifier</Label>
              <Input
                id="route-bus"
                value={busIdentifier}
                onChange={(e) => setBusIdentifier(e.target.value)}
                placeholder="LND-234-XY"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Driver (optional)</Label>
            <Select
              value={driverId}
              onValueChange={(v) => setDriverId(v ?? '')}
              items={[{ value: '', label: 'None' }, ...drivers.map((d) => ({ value: d.id, label: d.name }))]}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {drivers.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Conductor (optional)</Label>
            <Select
              value={conductorId}
              onValueChange={(v) => setConductorId(v ?? '')}
              items={[{ value: '', label: 'None' }, ...conductors.map((c) => ({ value: c.id, label: c.name }))]}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {conductors.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
