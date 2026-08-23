'use client';

import { Loader2, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { createResource, uploadResourceFile } from '@/lib/actions/resources';
import { RESOURCE_TYPE_LABELS } from '@/lib/resource-type-labels';
import type { ResourceType } from '@/lib/types/resources';

export interface UploadOption {
  classId: string;
  subjectId: string;
  label: string;
}

const TYPE_OPTIONS = (Object.keys(RESOURCE_TYPE_LABELS) as ResourceType[]).map((value) => ({
  value,
  label: RESOURCE_TYPE_LABELS[value],
}));

export function UploadResourceDialog({ options }: { options: UploadOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [contextKey, setContextKey] = useState('');
  const [type, setType] = useState<ResourceType>('NOTE');
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const isLink = type === 'VIDEO_LINK';

  function reset() {
    setContextKey('');
    setType('NOTE');
    setTitle('');
    setTopic('');
    setExternalUrl('');
    setFile(null);
  }

  async function handleSave() {
    const context = options.find((o) => `${o.classId}:${o.subjectId}` === contextKey);
    if (!context) return toast.error('Choose the class/subject.');
    if (!title.trim()) return toast.error('A title is required.');
    if (isLink && !externalUrl.trim()) return toast.error('Paste the video link.');
    if (!isLink && !file) return toast.error('Choose a file to upload.');

    setIsSaving(true);
    try {
      const resource = await createResource({
        title: title.trim(),
        topic: topic.trim() || undefined,
        type,
        subjectId: context.subjectId,
        classId: context.classId,
        externalUrl: isLink ? externalUrl.trim() : undefined,
      });
      if (!isLink && file) {
        const formData = new FormData();
        formData.set('file', file);
        await uploadResourceFile(resource.id, formData);
      }
      toast.success('Resource shared.');
      setOpen(false);
      reset();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't share the resource.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus className="size-4" aria-hidden="true" />
        Share Resource
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share a resource</DialogTitle>
          <DialogDescription>
            Visible to every student in the class you pick, in their E-Library.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Class / Subject</Label>
            <Select
              value={contextKey}
              onValueChange={(v) => {
                if (v) setContextKey(v);
              }}
              items={options.map((o) => ({
                value: `${o.classId}:${o.subjectId}`,
                label: o.label,
              }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose…" />
              </SelectTrigger>
              <SelectContent>
                {options.map((o) => (
                  <SelectItem key={`${o.classId}:${o.subjectId}`} value={`${o.classId}:${o.subjectId}`}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select
                value={type}
                onValueChange={(v) => {
                  if (v) setType(v as ResourceType);
                }}
                items={TYPE_OPTIONS}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="r-topic">Topic (optional)</Label>
              <Input
                id="r-topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Alkanes"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="r-title">Title</Label>
            <Input
              id="r-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Organic Chemistry summary notes"
            />
          </div>

          {isLink ? (
            <div className="space-y-1.5">
              <Label htmlFor="r-url">Video link</Label>
              <Input
                id="r-url"
                type="url"
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                placeholder="https://youtu.be/…"
              />
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="r-file">File</Label>
              <Input
                id="r-file"
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={() => void handleSave()} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Sharing…
              </>
            ) : (
              'Share'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
