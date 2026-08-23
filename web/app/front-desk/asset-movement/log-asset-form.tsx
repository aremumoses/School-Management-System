'use client';

import { Loader2, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { logAssetMovement } from '@/lib/actions/front-desk';
import type { AssetDirection } from '@/lib/types/front-desk';

export function LogAssetForm() {
  const router = useRouter();
  const [description, setDescription] = useState('');
  const [direction, setDirection] = useState<AssetDirection>('OUT');
  const [reason, setReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  async function handleLog() {
    if (!description.trim()) return toast.error('Describe the asset.');
    setIsSaving(true);
    try {
      await logAssetMovement({
        assetDescription: description.trim(),
        direction,
        reason: reason.trim() || undefined,
      });
      toast.success('Movement logged.');
      setDescription('');
      setReason('');
      setDirection('OUT');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't log the movement.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-56 flex-1 space-y-1">
        <Label htmlFor="am-desc">Asset description</Label>
        <Input
          id="am-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Epson projector (tag PR-004)"
        />
      </div>
      <div className="w-28 space-y-1">
        <Label>Direction</Label>
        <Select
          value={direction}
          onValueChange={(v) => {
            if (v) setDirection(v as AssetDirection);
          }}
          items={[
            { value: 'OUT', label: 'Out' },
            { value: 'IN', label: 'In' },
          ]}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="OUT">Out</SelectItem>
            <SelectItem value="IN">In</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="min-w-48 flex-1 space-y-1">
        <Label htmlFor="am-reason">Reason (optional)</Label>
        <Input
          id="am-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Education fair at the diocese"
        />
      </div>
      <Button size="sm" onClick={() => void handleLog()} disabled={isSaving}>
        {isSaving ? (
          <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
        ) : (
          <Plus className="size-3.5" aria-hidden="true" />
        )}
        Log
      </Button>
    </div>
  );
}
