'use client';

import { AlertTriangle, Loader2, Plus, Wrench } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createMaintenanceRecord } from '@/lib/actions/hostel-transport';
import type {
  VehicleDueSoonRow,
  VehicleMaintenanceRecordDto,
} from '@/lib/types/hostel-transport';

function DueSoonBanner({ dueSoon }: { dueSoon: VehicleDueSoonRow[] }) {
  if (dueSoon.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {dueSoon.map((bus) => (
        <Badge key={bus.busIdentifier} variant={bus.daysUntilDue <= 0 ? 'error' : 'warning'}>
          <AlertTriangle className="size-3" aria-hidden="true" />
          {bus.busIdentifier} —{' '}
          {bus.daysUntilDue <= 0
            ? `overdue by ${Math.abs(bus.daysUntilDue)} day(s)`
            : `due in ${bus.daysUntilDue} day(s)`}
        </Badge>
      ))}
    </div>
  );
}

function LogForm() {
  const router = useRouter();
  const [busIdentifier, setBusIdentifier] = useState('');
  const [serviceDate, setServiceDate] = useState('');
  const [description, setDescription] = useState('');
  const [cost, setCost] = useState('');
  const [nextServiceDueDate, setNextServiceDueDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  async function handleLog() {
    if (!busIdentifier.trim() || !serviceDate || !description.trim() || !cost) {
      return toast.error('Bus, service date, description, and cost are all required.');
    }
    setIsSaving(true);
    try {
      await createMaintenanceRecord({
        busIdentifier: busIdentifier.trim(),
        serviceDate,
        description: description.trim(),
        cost: Number(cost),
        nextServiceDueDate: nextServiceDueDate || undefined,
      });
      toast.success('Maintenance record logged.');
      setBusIdentifier('');
      setServiceDate('');
      setDescription('');
      setCost('');
      setNextServiceDueDate('');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't log this record.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="mnt-bus">Bus identifier</Label>
          <Input id="mnt-bus" value={busIdentifier} onChange={(e) => setBusIdentifier(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="mnt-service-date">Service date</Label>
          <Input
            id="mnt-service-date"
            type="date"
            value={serviceDate}
            onChange={(e) => setServiceDate(e.target.value)}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="mnt-description">Description</Label>
        <Input
          id="mnt-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Oil change, brake pads, tyres…"
        />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="mnt-cost">Cost (₦)</Label>
          <Input id="mnt-cost" type="number" min="0" value={cost} onChange={(e) => setCost(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="mnt-next-due">Next service due (optional)</Label>
          <Input
            id="mnt-next-due"
            type="date"
            value={nextServiceDueDate}
            onChange={(e) => setNextServiceDueDate(e.target.value)}
          />
        </div>
      </div>
      <div className="flex justify-end">
        <Button onClick={() => void handleLog()} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Plus className="size-4" aria-hidden="true" />
          )}
          Log Record
        </Button>
      </div>
    </div>
  );
}

export function MaintenanceView({
  records,
  dueSoon,
}: {
  records: VehicleMaintenanceRecordDto[];
  dueSoon: VehicleDueSoonRow[];
}) {
  return (
    <div className="space-y-6">
      <DueSoonBanner dueSoon={dueSoon} />

      <Card>
        <CardHeader>
          <CardTitle>Log a Service Record</CardTitle>
        </CardHeader>
        <CardContent>
          <LogForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>History ({records.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Wrench />
                </EmptyMedia>
                <EmptyTitle>No maintenance records yet</EmptyTitle>
                <EmptyDescription>Log a service record above.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <ul className="divide-y divide-border">
              {records.map((r) => (
                <li key={r.id} className="space-y-1 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-foreground">{r.busIdentifier}</p>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {new Date(r.serviceDate).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-foreground">{r.description}</p>
                  <p className="text-xs text-muted-foreground">
                    Cost: ₦{r.cost}
                    {r.nextServiceDueDate &&
                      ` · Next due: ${new Date(r.nextServiceDueDate).toLocaleDateString()}`}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
