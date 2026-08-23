'use client';

import { ImagePlus, Loader2, UploadCloud } from 'lucide-react';
import Image from 'next/image';
import { useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { uploadSchoolLogo } from '@/lib/actions/school';
import { cn } from '@/lib/utils';

const MAX_SIZE_BYTES = 5 * 1024 * 1024;

export function LogoUploader({ currentLogoUrl }: { currentLogoUrl: string | null }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentLogoUrl);
  const [isDragging, setIsDragging] = useState(false);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file.');
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      toast.error('Logo must be 5MB or smaller.');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    const formData = new FormData();
    formData.set('file', file);
    startTransition(async () => {
      try {
        const school = await uploadSchoolLogo(formData);
        setPreviewUrl(school.logoUrl);
        toast.success('Logo updated.');
      } catch (error) {
        setPreviewUrl(currentLogoUrl);
        toast.error(error instanceof Error ? error.message : 'Failed to upload logo.');
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    });
  }

  return (
    <div className="flex items-center gap-4">
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload school logo"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFile(e.dataTransfer.files[0]);
        }}
        className={cn(
          'relative flex size-24 shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border bg-muted/40 text-muted-foreground transition-colors hover:border-primary hover:text-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
          isDragging && 'border-primary bg-primary/5 text-primary',
        )}
      >
        {isPending ? (
          <Loader2 className="size-6 animate-spin" aria-hidden="true" />
        ) : previewUrl ? (
          <Image
            src={previewUrl}
            alt="School logo"
            fill
            className="rounded-lg object-contain p-2"
            unoptimized
          />
        ) : (
          <>
            <ImagePlus className="size-6" aria-hidden="true" />
            <span className="text-[10px] font-medium">No logo</span>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>
      <div className="space-y-1 text-sm text-muted-foreground">
        <p className="flex items-center gap-1.5 font-medium text-foreground">
          <UploadCloud className="size-4" aria-hidden="true" />
          Drag and drop, or click to browse
        </p>
        <p>PNG, JPG, or SVG — up to 5MB.</p>
      </div>
    </div>
  );
}
