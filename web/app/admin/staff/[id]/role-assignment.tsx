'use client';

import { Plus, X } from 'lucide-react';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { assignRole, removeRole } from '@/lib/actions/staff';
import { ROLE_LABELS } from '@/lib/role-labels';
import type { StaffRoleDto, StaffRoleName } from '@/lib/types/staff';

const ALL_STAFF_ROLES: StaffRoleName[] = [
  'ADMIN',
  'VICE_PRINCIPAL',
  'HOD',
  'CLASS_TEACHER',
  'SUBJECT_TEACHER',
  'EXAM_OFFICER',
  'BURSAR',
  'LIBRARIAN',
  'HOSTEL_WARDEN',
  'TRANSPORT_OFFICER',
  'HR_OFFICER',
  'FRONT_DESK',
];

export function RoleAssignment({ staffId, roles }: { staffId: string; roles: StaffRoleDto[] }) {
  const [pendingRemovalId, setPendingRemovalId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [, startTransition] = useTransition();

  const availableRoles = ALL_STAFF_ROLES.filter(
    (role) => !roles.some((r) => r.role === role),
  );

  function handleAdd(role: string) {
    startTransition(async () => {
      try {
        await assignRole(staffId, { role: role as StaffRoleName });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to assign role.');
      } finally {
        setSelectedRole('');
      }
    });
  }

  function handleRemove(roleAssignment: StaffRoleDto) {
    setPendingRemovalId(roleAssignment.id);
    startTransition(async () => {
      try {
        await removeRole(staffId, roleAssignment.id);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to remove role.');
      } finally {
        setPendingRemovalId(null);
      }
    });
  }

  return (
    <Card className="rounded-xl ring-0 [--card-spacing:--spacing(6)] dark:ring-1">
      <CardHeader className="border-b">
        <CardTitle className="text-lg font-semibold text-heading">Roles</CardTitle>
        <CardDescription>
          Roles decide which dashboards and actions this staff member can use.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap gap-2">
          {roles.length === 0 ? (
            <p className="text-sm text-muted-foreground">No roles assigned yet.</p>
          ) : (
            roles.map((role) => (
              <span
                key={role.id}
                className="inline-flex items-center gap-1 rounded-full bg-primary/10 py-1 pr-1 pl-3 text-sm font-medium text-primary dark:text-foreground"
              >
                {ROLE_LABELS[role.role]}
                <button
                  type="button"
                  aria-label={`Remove ${ROLE_LABELS[role.role]} role`}
                  disabled={pendingRemovalId === role.id}
                  onClick={() => handleRemove(role)}
                  className="rounded-full p-1 hover:bg-destructive/10 hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-50"
                >
                  <X className="size-3.5" />
                </button>
              </span>
            ))
          )}
        </div>

        {availableRoles.length > 0 && (
          <Select
            value={selectedRole}
            onValueChange={(value) => {
              if (!value) return;
              setSelectedRole(value);
              handleAdd(value);
            }}
            items={availableRoles.map((role) => ({ value: role, label: ROLE_LABELS[role] }))}
          >
            <SelectTrigger className="w-60 data-[size=default]:h-10">
              <Plus className="size-3.5 text-muted-foreground" aria-hidden="true" />
              <SelectValue placeholder="Add a role…" />
            </SelectTrigger>
            <SelectContent>
              {availableRoles.map((role) => (
                <SelectItem key={role} value={role}>
                  {ROLE_LABELS[role]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </CardContent>
    </Card>
  );
}
