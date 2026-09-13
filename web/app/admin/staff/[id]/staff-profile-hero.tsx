import { Building2, Mail, Phone, ShieldCheck } from 'lucide-react';
import { ProfileHero } from '@/components/dashboard/profile-hero';
import { Badge } from '@/components/ui/badge';
import { ROLE_LABELS } from '@/lib/role-labels';
import type { StaffEmploymentRecordDto } from '@/lib/types/hr';
import type { StaffDto } from '@/lib/types/staff';

/** Shared by the admin and HR staff profiles, which load the same data. */
export function StaffProfileHero({
  staff,
  employmentRecord,
}: {
  staff: StaffDto;
  employmentRecord: StaffEmploymentRecordDto | null;
}) {
  const roleLabels = staff.roles.map((role) => ROLE_LABELS[role.role]);
  const employed = staff.employmentDate
    ? `Employed ${new Date(staff.employmentDate).toLocaleDateString('en-GB', {
        month: 'short',
        year: 'numeric',
      })}`
    : 'Employment date not set';

  return (
    <ProfileHero
      name={`${staff.firstName} ${staff.lastName}`}
      role={roleLabels[0] ?? 'Staff'}
      meta={[employed]}
      initials={`${staff.firstName[0] ?? ''}${staff.lastName[0] ?? ''}`.toUpperCase()}
      badge={staff.isActive ? undefined : <Badge variant="error">Inactive</Badge>}
      details={[
        { icon: Mail, label: 'Email', value: staff.email },
        { icon: Phone, label: 'Phone', value: staff.phone ?? '—' },
        { icon: Building2, label: 'Department', value: employmentRecord?.department ?? '—' },
        {
          icon: ShieldCheck,
          label: 'Roles',
          value: roleLabels.length > 0 ? roleLabels.join(', ') : 'None assigned',
        },
      ]}
    />
  );
}
