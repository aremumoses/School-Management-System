'use client';

import { UserCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { convertCandidateToStaff } from '@/lib/actions/hr';
import { ROLE_LABELS } from '@/lib/role-labels';
import type { StaffRoleName } from '@/lib/types/staff';

const AVAILABLE_ROLES: StaffRoleName[] = [
  'CLASS_TEACHER',
  'SUBJECT_TEACHER',
  'HOD',
  'VICE_PRINCIPAL',
  'EXAM_OFFICER',
  'BURSAR',
  'LIBRARIAN',
  'HOSTEL_WARDEN',
  'TRANSPORT_OFFICER',
  'HR_OFFICER',
  'FRONT_DESK',
  'ADMIN',
];

export function ConvertCandidateDialog({
  candidateId,
  candidateName,
}: {
  candidateId: string;
  candidateName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<StaffRoleName[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  function toggleRole(role: StaffRoleName, checked: boolean) {
    setSelectedRoles((current) =>
      checked ? [...current, role] : current.filter((r) => r !== role),
    );
  }

  async function handleConvert() {
    if (selectedRoles.length === 0) {
      toast.error('Select at least one role for the new staff login.');
      return;
    }
    setIsSaving(true);
    try {
      const result = await convertCandidateToStaff(candidateId, { roles: selectedRoles });
      toast.success(
        result.temporaryPassword
          ? `Staff login created. Temporary password: ${result.temporaryPassword}`
          : 'Staff login created.',
        { duration: 15000 },
      );
      setOpen(false);
      setSelectedRoles([]);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't convert this candidate.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <UserCheck className="size-3.5" aria-hidden="true" />
        Convert to Staff
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convert {candidateName} to Staff</DialogTitle>
          <DialogDescription>
            Creates a real staff login for this candidate. Choose which role(s) they&apos;ll hold.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2">
          {AVAILABLE_ROLES.map((role) => (
            <div key={role} className="flex items-center gap-2">
              <Checkbox
                id={`role-${role}`}
                checked={selectedRoles.includes(role)}
                onCheckedChange={(checked) => toggleRole(role, checked === true)}
              />
              <Label htmlFor={`role-${role}`} className="text-sm font-normal">
                {ROLE_LABELS[role]}
              </Label>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button onClick={() => void handleConvert()} disabled={isSaving}>
            {isSaving ? 'Converting…' : 'Convert to Staff'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
