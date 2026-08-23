'use client';

import { Camera, Loader2, User } from 'lucide-react';
import Image from 'next/image';
import { useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { InlineEditField } from '@/components/dashboard/inline-edit-field';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { softDeleteStudent, updateStudent, uploadStudentPhoto } from '@/lib/actions/students';
import type { StudentDetailDto } from '@/lib/types/students';

const GENDER_OPTIONS = [
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
];

export function BioDataTab({ student }: { student: StudentDetailDto }) {
  const [photoUrl, setPhotoUrl] = useState(student.photoUrl);
  const [isUploadingPhoto, startPhotoUpload] = useTransition();
  const [isActive, setIsActive] = useState(student.isActive);
  const [confirmingDeactivate, setConfirmingDeactivate] = useState(false);
  const [isTogglePending, setIsTogglePending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handlePhotoChange(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file.');
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setPhotoUrl(objectUrl);

    const formData = new FormData();
    formData.set('file', file);
    startPhotoUpload(async () => {
      try {
        const updated = await uploadStudentPhoto(student.id, formData);
        setPhotoUrl(updated.photoUrl);
        toast.success('Photo updated.');
      } catch (error) {
        setPhotoUrl(student.photoUrl);
        toast.error(error instanceof Error ? error.message : 'Failed to upload photo.');
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    });
  }

  async function save<K extends keyof StudentDetailDto>(field: K, value: string) {
    await updateStudent(student.id, { [field]: value });
  }

  async function setActive(next: boolean) {
    setIsTogglePending(true);
    try {
      if (next) {
        await updateStudent(student.id, { isActive: true });
      } else {
        await softDeleteStudent(student.id);
      }
      setIsActive(next);
      toast.success(next ? 'Student reactivated.' : 'Student deactivated.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update status.');
    } finally {
      setIsTogglePending(false);
      setConfirmingDeactivate(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <span className="text-sm font-medium text-foreground">Status</span>
        <div className="flex items-center gap-2">
          <Label htmlFor="student-active-toggle" className="text-sm text-muted-foreground">
            {isActive ? 'Active' : 'Inactive'}
          </Label>
          <Switch
            id="student-active-toggle"
            checked={isActive}
            disabled={isTogglePending}
            onCheckedChange={(checked) => {
              if (checked) {
                void setActive(true);
              } else {
                setConfirmingDeactivate(true);
              }
            }}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-4">
          <div
            role="button"
            tabIndex={0}
            aria-label="Change student photo"
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
            }}
            className="relative flex size-24 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-border bg-muted/40 text-muted-foreground hover:border-primary hover:text-primary"
          >
            {isUploadingPhoto ? (
              <Loader2 className="size-6 animate-spin" aria-hidden="true" />
            ) : photoUrl ? (
              <Image src={photoUrl} alt="" fill className="object-cover" unoptimized />
            ) : (
              <User className="size-10" aria-hidden="true" />
            )}
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-black/50 py-1 text-[10px] font-medium text-white">
              <Camera className="size-3" aria-hidden="true" />
              Change
            </div>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => handlePhotoChange(e.target.files?.[0])}
            />
          </div>
          <div>
            <p className="text-lg font-semibold text-foreground">
              {student.firstName} {student.lastName}
            </p>
            <p className="font-mono text-sm text-muted-foreground">{student.admissionNumber}</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <InlineEditField
            label="First Name"
            value={student.firstName}
            onSave={(v) => save('firstName', v)}
          />
          <InlineEditField
            label="Last Name"
            value={student.lastName}
            onSave={(v) => save('lastName', v)}
          />
          <InlineEditField
            label="Date of Birth"
            type="date"
            value={student.dateOfBirth.slice(0, 10)}
            onSave={(v) => save('dateOfBirth', v)}
            formatDisplay={(v) => new Date(v).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          />
          <InlineEditField
            label="Gender"
            type="select"
            options={GENDER_OPTIONS}
            value={student.gender}
            onSave={(v) => save('gender', v)}
          />
          <InlineEditField
            label="Email"
            value={student.email ?? ''}
            onSave={(v) => save('email', v)}
          />
          <InlineEditField
            label="State of Origin"
            value={student.stateOfOrigin ?? ''}
            onSave={(v) => save('stateOfOrigin', v)}
          />
          <InlineEditField label="LGA" value={student.lga ?? ''} onSave={(v) => save('lga', v)} />
          <InlineEditField
            label="Religion"
            value={student.religion ?? ''}
            onSave={(v) => save('religion', v)}
          />
          <InlineEditField
            label="Blood Group"
            value={student.bloodGroup ?? ''}
            onSave={(v) => save('bloodGroup', v)}
          />
          <InlineEditField
            label="Genotype"
            value={student.genotype ?? ''}
            onSave={(v) => save('genotype', v)}
          />
          <InlineEditField
            label="Address"
            value={student.address ?? ''}
            onSave={(v) => save('address', v)}
          />
        </div>
      </CardContent>

      <AlertDialog open={confirmingDeactivate} onOpenChange={setConfirmingDeactivate}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Deactivate {student.firstName} {student.lastName}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This withdraws their active enrollment and signs them out of every device (if they
              have a login). They won&apos;t appear in the Student Directory unless you choose to
              include inactive students. They can be reactivated at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isTogglePending}
              onClick={() => setActive(false)}
            >
              {isTogglePending ? 'Deactivating…' : 'Deactivate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
