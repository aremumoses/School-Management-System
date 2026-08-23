'use client';

import { BedDouble } from 'lucide-react';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { HostelDto } from '@/lib/types/hostel-transport';
import { cn } from '@/lib/utils';
import { BedDialog } from './bed-dialog';
import { NewHostelDialog } from './new-hostel-dialog';
import { NewRoomDialog } from './new-room-dialog';

export function RoomsView({ hostels }: { hostels: HostelDto[] }) {
  const [hostelId, setHostelId] = useState(hostels[0]?.id ?? '');
  const [selectedBed, setSelectedBed] = useState<{
    roomId: string;
    bedNumber: number;
  } | null>(null);

  const selectedHostel = hostels.find((h) => h.id === hostelId);

  const activeBed = selectedBed
    ? selectedHostel?.rooms
        .find((r) => r.id === selectedBed.roomId)
        ?.bedAllocations.find((a) => a.bedNumber === selectedBed.bedNumber) ?? null
    : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Select
          value={hostelId}
          onValueChange={(v) => v && setHostelId(v)}
          items={hostels.map((h) => ({ value: h.id, label: h.name }))}
        >
          <SelectTrigger className="w-full sm:w-64" aria-label="Choose hostel">
            <SelectValue placeholder="Choose a hostel…" />
          </SelectTrigger>
          <SelectContent>
            {hostels.map((h) => (
              <SelectItem key={h.id} value={h.id}>
                {h.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <NewHostelDialog />
      </div>

      {hostels.length === 0 ? (
        <Empty className="border border-dashed border-border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BedDouble />
            </EmptyMedia>
            <EmptyTitle>No hostels yet</EmptyTitle>
            <EmptyDescription>Create a hostel above before adding rooms.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        selectedHostel && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <NewRoomDialog hostelId={selectedHostel.id} />
          </div>

          {selectedHostel.rooms.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
              No rooms in this hostel yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {selectedHostel.rooms.map((room) => (
                <Card key={room.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between text-sm">
                      Room {room.roomNumber}
                      <span className="text-xs font-normal text-muted-foreground">
                        {room.bedAllocations.length}/{room.bedCapacity} beds
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-4 gap-1.5">
                      {Array.from({ length: room.bedCapacity }, (_, i) => i + 1).map(
                        (bedNumber) => {
                          const allocation = room.bedAllocations.find(
                            (a) => a.bedNumber === bedNumber,
                          );
                          return (
                            <button
                              key={bedNumber}
                              type="button"
                              onClick={() => setSelectedBed({ roomId: room.id, bedNumber })}
                              aria-label={
                                allocation
                                  ? `Bed ${bedNumber} — occupied by ${allocation.student.firstName} ${allocation.student.lastName}`
                                  : `Bed ${bedNumber} — vacant`
                              }
                              className={cn(
                                'flex h-11 flex-col items-center justify-center rounded-lg border text-[10px] leading-tight font-medium transition-colors',
                                allocation
                                  ? 'border-primary bg-primary/10 text-foreground hover:bg-primary/20'
                                  : 'border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary',
                              )}
                            >
                              <span className="font-semibold">{bedNumber}</span>
                              {allocation && (
                                <span className="truncate px-0.5">
                                  {allocation.student.firstName}
                                </span>
                              )}
                            </button>
                          );
                        },
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
        )
      )}

      {selectedBed && (
        <BedDialog
          roomId={selectedBed.roomId}
          bedNumber={selectedBed.bedNumber}
          allocation={activeBed}
          onClose={() => setSelectedBed(null)}
        />
      )}
    </div>
  );
}
