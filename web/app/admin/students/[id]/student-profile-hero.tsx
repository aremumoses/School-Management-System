import { Mail, MapPin, Phone, Users } from 'lucide-react';
import { ProfileHero } from '@/components/dashboard/profile-hero';
import { Badge } from '@/components/ui/badge';
import type { StudentDetailDto } from '@/lib/types/students';

export function StudentProfileHero({ student }: { student: StudentDetailDto }) {
  const enrollment = student.enrollments[0];
  const primaryGuardian = student.guardians[0];

  return (
    <ProfileHero
      name={`${student.firstName} ${student.lastName}`}
      role="Student"
      meta={[
        student.admissionNumber,
        enrollment ? `${enrollment.class.name} ${enrollment.arm.name}` : 'Not enrolled',
      ]}
      photoUrl={student.photoUrl}
      initials={`${student.firstName[0] ?? ''}${student.lastName[0] ?? ''}`.toUpperCase()}
      badge={student.isActive ? undefined : <Badge variant="error">Inactive</Badge>}
      details={[
        {
          icon: Users,
          label: 'Guardian',
          value: primaryGuardian
            ? `${primaryGuardian.guardian.firstName} ${primaryGuardian.guardian.lastName} (${primaryGuardian.relationship})`
            : 'None linked',
        },
        { icon: Phone, label: 'Guardian phone', value: primaryGuardian?.guardian.phone ?? '—' },
        { icon: MapPin, label: 'Address', value: student.address ?? '—' },
        { icon: Mail, label: 'Email', value: student.email ?? '—' },
      ]}
    />
  );
}
