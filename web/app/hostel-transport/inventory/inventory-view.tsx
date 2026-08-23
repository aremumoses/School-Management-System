'use client';

import { Loader2, Package, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { StudentSearchBox } from '@/components/hostel-transport/student-search-box';
import type { StudentSearchRow } from '@/lib/actions/hostel-transport';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createInventoryItem, updateInventoryItem } from '@/lib/actions/hostel-transport';
import type {
  HostelDto,
  HostelInventoryItemDto,
  InventoryCondition,
} from '@/lib/types/hostel-transport';

const CONDITION_BADGE: Record<InventoryCondition, 'success' | 'warning' | 'error' | 'outline'> = {
  GOOD: 'success',
  FAIR: 'warning',
  DAMAGED: 'error',
  LOST: 'outline',
};

const CONDITION_OPTIONS: { value: InventoryCondition; label: string }[] = [
  { value: 'GOOD', label: 'Good' },
  { value: 'FAIR', label: 'Fair' },
  { value: 'DAMAGED', label: 'Damaged' },
  { value: 'LOST', label: 'Lost' },
];

function ItemForm({ hostels }: { hostels: HostelDto[] }) {
  const router = useRouter();
  const [scope, setScope] = useState<'ROOM' | 'STUDENT'>('ROOM');
  const [roomId, setRoomId] = useState('');
  const [student, setStudent] = useState<StudentSearchRow | null>(null);
  const [description, setDescription] = useState('');
  const [condition, setCondition] = useState<InventoryCondition>('GOOD');
  const [isSaving, setIsSaving] = useState(false);

  const roomOptions = hostels.flatMap((h) =>
    h.rooms.map((r) => ({ id: r.id, label: `${h.name} — Room ${r.roomNumber}` })),
  );

  async function handleCreate() {
    if (!description.trim()) return toast.error('A description is required.');
    if (scope === 'ROOM' && !roomId) return toast.error('Choose a room.');
    if (scope === 'STUDENT' && !student) return toast.error('Choose a boarder.');
    setIsSaving(true);
    try {
      await createInventoryItem({
        roomId: scope === 'ROOM' ? roomId : undefined,
        studentId: scope === 'STUDENT' ? student!.id : undefined,
        description: description.trim(),
        condition,
      });
      toast.success('Item added.');
      setDescription('');
      setCondition('GOOD');
      setRoomId('');
      setStudent(null);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't add this item.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant={scope === 'ROOM' ? 'default' : 'outline'}
          onClick={() => setScope('ROOM')}
        >
          Room item
        </Button>
        <Button
          type="button"
          size="sm"
          variant={scope === 'STUDENT' ? 'default' : 'outline'}
          onClick={() => setScope('STUDENT')}
        >
          Boarder item
        </Button>
      </div>

      {scope === 'ROOM' ? (
        <div className="space-y-1.5">
          <Label>Room</Label>
          <Select
            value={roomId}
            onValueChange={(v) => v && setRoomId(v)}
            items={roomOptions.map((r) => ({ value: r.id, label: r.label }))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose a room…" />
            </SelectTrigger>
            <SelectContent>
              {roomOptions.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <div className="space-y-1.5">
          <Label>Boarder</Label>
          <StudentSearchBox onSelect={setStudent} />
          {student && (
            <p className="text-sm text-foreground">
              {student.firstName} {student.lastName}
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="item-description">Description</Label>
          <Input
            id="item-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Bunk bed, mattress, wardrobe…"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Condition</Label>
          <Select
            value={condition}
            onValueChange={(v) => v && setCondition(v as InventoryCondition)}
            items={CONDITION_OPTIONS}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CONDITION_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => void handleCreate()} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Plus className="size-4" aria-hidden="true" />
          )}
          Add Item
        </Button>
      </div>
    </div>
  );
}

function ConditionCell({ item }: { item: HostelInventoryItemDto }) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  async function handleChange(value: string | null) {
    if (!value || value === item.condition) return;
    setIsSaving(true);
    try {
      await updateInventoryItem(item.id, { condition: value });
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't update condition.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Select value={item.condition} onValueChange={handleChange} items={CONDITION_OPTIONS}>
      <SelectTrigger className="h-8 w-28 text-xs" disabled={isSaving}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {CONDITION_OPTIONS.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function InventoryView({
  items,
  hostels,
}: {
  items: HostelInventoryItemDto[];
  hostels: HostelDto[];
}) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add Inventory Item</CardTitle>
        </CardHeader>
        <CardContent>
          <ItemForm hostels={hostels} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Items ({items.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Package />
                </EmptyMedia>
                <EmptyTitle>No inventory items yet</EmptyTitle>
                <EmptyDescription>Add furniture or beddings above.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{item.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.room
                        ? `${item.room.hostel.name} — Room ${item.room.roomNumber}`
                        : item.student
                          ? `${item.student.firstName} ${item.student.lastName} (${item.student.admissionNumber})`
                          : '—'}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant={CONDITION_BADGE[item.condition]}>{item.condition}</Badge>
                    <ConditionCell item={item} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
