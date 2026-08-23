'use client';

import { ChevronDown, ChevronRight, Loader2, Plus, Route as RouteIcon, Trash2 } from 'lucide-react';
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
import { createRouteStop, deleteRouteStop } from '@/lib/actions/hostel-transport';
import type { TransportRouteDto, TransportStaffRecordDto } from '@/lib/types/hostel-transport';
import { NewRouteDialog } from './new-route-dialog';

function StopBuilder({ route }: { route: TransportRouteDto }) {
  const router = useRouter();
  const [stopName, setStopName] = useState('');
  const [approximateTime, setApproximateTime] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const nextOrder = route.stops.length + 1;

  async function handleAdd() {
    if (!stopName.trim()) return toast.error('A stop name is required.');
    setIsSaving(true);
    try {
      await createRouteStop(route.id, {
        stopName: stopName.trim(),
        order: nextOrder,
        approximateTime: approximateTime || undefined,
      });
      toast.success('Stop added.');
      setStopName('');
      setApproximateTime('');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't add this stop.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRemove(stopId: string) {
    setRemovingId(stopId);
    try {
      await deleteRouteStop(stopId);
      toast.success('Stop removed.');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't remove this stop.");
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="space-y-3">
      {route.stops.length > 0 && (
        <ol className="space-y-1.5">
          {route.stops.map((stop) => (
            <li
              key={stop.id}
              className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
            >
              <span>
                <span className="mr-1.5 font-medium text-muted-foreground">{stop.order}.</span>
                {stop.stopName}
                {stop.approximateTime && (
                  <span className="ml-1.5 text-xs text-muted-foreground">({stop.approximateTime})</span>
                )}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => void handleRemove(stop.id)}
                disabled={removingId === stop.id}
                aria-label={`Remove ${stop.stopName}`}
              >
                {removingId === stop.id ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <Trash2 className="size-3.5" aria-hidden="true" />
                )}
              </Button>
            </li>
          ))}
        </ol>
      )}
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex-1 space-y-1">
          <Input
            value={stopName}
            onChange={(e) => setStopName(e.target.value)}
            placeholder={`Stop ${nextOrder} name…`}
            aria-label="New stop name"
          />
        </div>
        <Input
          type="time"
          value={approximateTime}
          onChange={(e) => setApproximateTime(e.target.value)}
          className="w-32"
          aria-label="Approximate time"
        />
        <Button size="sm" onClick={() => void handleAdd()} disabled={isSaving}>
          {isSaving ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : <Plus className="size-3.5" aria-hidden="true" />}
          Add Stop
        </Button>
      </div>
    </div>
  );
}

function RouteCard({ route }: { route: TransportRouteDto }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 py-3">
        <div>
          <CardTitle className="text-base">{route.name}</CardTitle>
          <p className="text-xs text-muted-foreground">
            Bus {route.busIdentifier}
            {route.driver && ` · Driver: ${route.driver.name}`}
            {route.conductor && ` · Conductor: ${route.conductor.name}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{route._count.studentAssignments} riders</Badge>
          <Badge variant="outline">{route.stops.length} stops</Badge>
          <Button variant="ghost" size="sm" onClick={() => setExpanded((e) => !e)}>
            {expanded ? (
              <ChevronDown className="size-4" aria-hidden="true" />
            ) : (
              <ChevronRight className="size-4" aria-hidden="true" />
            )}
            Stops
          </Button>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent>
          <StopBuilder route={route} />
        </CardContent>
      )}
    </Card>
  );
}

export function RoutesView({
  routes,
  staff,
}: {
  routes: TransportRouteDto[];
  staff: TransportStaffRecordDto[];
}) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <NewRouteDialog staff={staff} />
      </div>

      {routes.length === 0 ? (
        <Empty className="border border-dashed border-border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <RouteIcon />
            </EmptyMedia>
            <EmptyTitle>No routes yet</EmptyTitle>
            <EmptyDescription>Add a route above, then build its stop list.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="space-y-2">
          {routes.map((route) => (
            <RouteCard key={route.id} route={route} />
          ))}
        </div>
      )}
    </div>
  );
}
