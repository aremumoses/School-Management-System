import { IdCard } from '@/components/students/id-card';
import type { StudentDetailDto } from '@/lib/types/students';

// qrDataUrl is generated server-side in page.tsx (qrcode's Node API) and
// passed down here — this file only needs to be a thin wrapper deriving
// the current class/arm label, not a Server Component itself, since it's
// rendered from student-profile-tabs.tsx (a Client Component, which can't
// directly render a Server Component — see that file's TabsContent usage).
export function IdCardTab({
  student,
  qrDataUrl,
}: {
  student: StudentDetailDto;
  qrDataUrl: string | null;
}) {
  const enrollment = student.enrollments[0];
  return (
    <IdCard
      student={{
        firstName: student.firstName,
        lastName: student.lastName,
        admissionNumber: student.admissionNumber,
        photoUrl: student.photoUrl,
        className: enrollment ? `${enrollment.class.name} ${enrollment.arm.name}` : null,
      }}
      qrDataUrl={qrDataUrl}
    />
  );
}
