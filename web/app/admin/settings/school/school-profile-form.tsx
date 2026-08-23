'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Info } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateSchoolProfile } from '@/lib/actions/school';
import type { SchoolDto } from '@/lib/types/academic';
import { ColorField } from './color-field';
import { LogoUploader } from './logo-uploader';

const HEX_COLOR = /^#([0-9a-fA-F]{6})$/;

const schoolProfileSchema = z.object({
  name: z.string().min(1, 'School name is required').max(200),
  address: z.string().max(500).optional(),
  registrationNumber: z.string().max(100).optional(),
  motto: z.string().max(200).optional(),
  documentPrimaryColor: z
    .string()
    .regex(HEX_COLOR, 'Enter a valid hex color, e.g. #4F46E5')
    .or(z.literal(''))
    .optional(),
  documentSecondaryColor: z
    .string()
    .regex(HEX_COLOR, 'Enter a valid hex color, e.g. #F59E0B')
    .or(z.literal(''))
    .optional(),
});

type SchoolProfileValues = z.infer<typeof schoolProfileSchema>;

export function SchoolProfileForm({ school }: { school: SchoolDto }) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<SchoolProfileValues>({
    resolver: zodResolver(schoolProfileSchema),
    defaultValues: {
      name: school.name,
      address: school.address ?? '',
      registrationNumber: school.registrationNumber ?? '',
      motto: school.motto ?? '',
      documentPrimaryColor: school.documentPrimaryColor ?? '',
      documentSecondaryColor: school.documentSecondaryColor ?? '',
    },
  });

  async function onSubmit(values: SchoolProfileValues) {
    try {
      await updateSchoolProfile({
        name: values.name,
        address: values.address ?? '',
        registrationNumber: values.registrationNumber ?? '',
        motto: values.motto ?? '',
        // IsHexColor() rejects an empty string, so omit the key entirely
        // rather than sending "" when a color hasn't been set.
        ...(values.documentPrimaryColor
          ? { documentPrimaryColor: values.documentPrimaryColor }
          : {}),
        ...(values.documentSecondaryColor
          ? { documentSecondaryColor: values.documentSecondaryColor }
          : {}),
      });
      toast.success('School profile saved.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save profile.');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile & Branding</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
          <div className="space-y-2">
            <Label>School Logo</Label>
            <LogoUploader currentLogoUrl={school.logoUrl} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="name">
                School Name <span className="text-destructive">*</span>
              </Label>
              <Input id="name" aria-invalid={Boolean(errors.name)} {...register('name')} />
              {errors.name && (
                <p className="flex items-center gap-1 text-sm text-destructive">
                  <AlertCircle className="size-3.5" aria-hidden="true" />
                  {errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" {...register('address')} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="registrationNumber">Registration Number</Label>
              <Input id="registrationNumber" {...register('registrationNumber')} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="motto">Motto</Label>
              <Input id="motto" {...register('motto')} />
            </div>
          </div>

          <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <ColorField
                id="documentPrimaryColor"
                label="Document Primary Color"
                value={watch('documentPrimaryColor') ?? ''}
                onChange={(v) => setValue('documentPrimaryColor', v, { shouldDirty: true })}
              />
              <ColorField
                id="documentSecondaryColor"
                label="Document Secondary Color"
                value={watch('documentSecondaryColor') ?? ''}
                onChange={(v) => setValue('documentSecondaryColor', v, { shouldDirty: true })}
              />
            </div>
            {(errors.documentPrimaryColor || errors.documentSecondaryColor) && (
              <p className="flex items-center gap-1 text-sm text-destructive">
                <AlertCircle className="size-3.5" aria-hidden="true" />
                {errors.documentPrimaryColor?.message ?? errors.documentSecondaryColor?.message}
              </p>
            )}
            <p className="flex items-start gap-1.5 text-sm text-info-soft-foreground">
              <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              These colors appear on printed report cards and receipts only — they don&apos;t
              change how this app looks.
            </p>
          </div>

          <Button type="submit" disabled={isSubmitting || !isDirty}>
            {isSubmitting ? 'Saving…' : 'Save Profile'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
