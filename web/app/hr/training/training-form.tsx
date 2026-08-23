'use client';

import { Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createTrainingRecord } from '@/lib/actions/training';
import type { StaffDto } from '@/lib/types/staff';

export function TrainingForm({
  staff,
  onLogged,
}: {
  staff: StaffDto[];
  onLogged: (staffId: string) => void;
}) {
  const [staffId, setStaffId] = useState('');
  const [title, setTitle] = useState('');
  const [provider, setProvider] = useState('');
  const [completedDate, setCompletedDate] = useState('');
  const [hoursOrCredits, setHoursOrCredits] = useState('');
  const [certificate, setCertificate] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const options = staff.map((s) => ({ value: s.id, label: `${s.firstName} ${s.lastName}` }));

  async function handleSubmit() {
    if (!staffId || !title.trim() || !provider.trim() || !completedDate) {
      toast.error('Staff member, title, provider, and date are all required.');
      return;
    }
    setIsSaving(true);
    try {
      const formData = new FormData();
      formData.set('staffId', staffId);
      formData.set('title', title.trim());
      formData.set('provider', provider.trim());
      formData.set('completedDate', completedDate);
      if (hoursOrCredits) formData.set('hoursOrCredits', hoursOrCredits);
      if (certificate) formData.set('certificate', certificate);

      await createTrainingRecord(formData);
      toast.success('Training record logged.');
      setTitle('');
      setProvider('');
      setCompletedDate('');
      setHoursOrCredits('');
      setCertificate(null);
      onLogged(staffId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't log this record.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Log a Training / CPD Record</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label>Staff Member</Label>
          <Select value={staffId} onValueChange={(v) => v && setStaffId(v)} items={options}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select staff member" />
            </SelectTrigger>
            <SelectContent>
              {options.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="training-title">Title</Label>
            <Input
              id="training-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Classroom Management Workshop"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="training-provider">Provider</Label>
            <Input
              id="training-provider"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="training-date">Completed Date</Label>
            <Input
              id="training-date"
              type="date"
              value={completedDate}
              onChange={(e) => setCompletedDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="training-hours">Hours / Credits (optional)</Label>
            <Input
              id="training-hours"
              type="number"
              min="0"
              value={hoursOrCredits}
              onChange={(e) => setHoursOrCredits(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Certificate (optional)</Label>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-4 text-sm text-muted-foreground hover:border-primary hover:text-primary"
          >
            <Upload className="size-4" aria-hidden="true" />
            {certificate ? certificate.name : 'Click to choose a file'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(e) => setCertificate(e.target.files?.[0] ?? null)}
          />
        </div>
        <div className="flex justify-end">
          <Button onClick={() => void handleSubmit()} disabled={isSaving}>
            {isSaving ? 'Logging…' : 'Log Record'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
