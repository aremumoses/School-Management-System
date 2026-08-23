'use client';

import { Loader2, Pencil, Plus } from 'lucide-react';
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
import { Switch } from '@/components/ui/switch';
import { createTransportStaffRecord, updateTransportStaffRecord } from '@/lib/actions/hostel-transport';
import type { TransportStaffRecordDto, TransportStaffRole } from '@/lib/types/hostel-transport';

export function DriverFormDialog({ record }: { record?: TransportStaffRecordDto }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(record?.name ?? '');
  const [role, setRole] = useState<TransportStaffRole>(record?.role ?? 'DRIVER');
  const [phone, setPhone] = useState(record?.phone ?? '');
  const [licenseNumber, setLicenseNumber] = useState(record?.licenseNumber ?? '');
  const [licenseExpiryDate, setLicenseExpiryDate] = useState(
    record?.licenseExpiryDate?.slice(0, 10) ?? '',
  );
  const [verified, setVerified] = useState(record?.verified ?? false);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    if (!name.trim() || !phone.trim()) return toast.error('Name and phone are both required.');
    setIsSaving(true);
    try {
      const input = {
        name: name.trim(),
        role,
        phone: phone.trim(),
        licenseNumber: licenseNumber.trim() || undefined,
        licenseExpiryDate: licenseExpiryDate || undefined,
        verified,
      };
      if (record) {
        await updateTransportStaffRecord(record.id, input);
        toast.success('Record updated.');
      } else {
        await createTransportStaffRecord(input);
        toast.success('Record added.');
      }
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't save this record.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={record ? <Button variant="ghost" size="sm" /> : <Button />}>
        {record ? (
          <>
            <Pencil className="size-3.5" aria-hidden="true" />
            Edit
          </>
        ) : (
          <>
            <Plus className="size-4" aria-hidden="true" />
            Add Record
          </>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{record ? 'Edit record' : 'Add a driver/conductor'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="driver-name">Name</Label>
              <Input id="driver-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select
                value={role}
                onValueChange={(v) => v && setRole(v as TransportStaffRole)}
                items={[
                  { value: 'DRIVER', label: 'Driver' },
                  { value: 'CONDUCTOR', label: 'Conductor' },
                ]}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRIVER">Driver</SelectItem>
                  <SelectItem value="CONDUCTOR">Conductor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="driver-phone">Phone</Label>
            <Input id="driver-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="driver-license">License number</Label>
              <Input
                id="driver-license"
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="driver-license-expiry">License expiry</Label>
              <Input
                id="driver-license-expiry"
                type="date"
                value={licenseExpiryDate}
                onChange={(e) => setLicenseExpiryDate(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-foreground">Verified</span>
            <Switch checked={verified} onCheckedChange={setVerified} aria-label="Verified" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={() => void handleSave()} disabled={isSaving}>
            {isSaving ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
