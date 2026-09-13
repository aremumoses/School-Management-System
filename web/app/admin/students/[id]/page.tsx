import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAttendanceSummary, getStudentAttendanceHistory } from '@/lib/actions/attendance';
import { ApiError, apiFetch } from '@/lib/api';
import { generateQrDataUrl } from '@/lib/qr-code';
import type { AcademicSessionDto, ClassDto, TermDto } from '@/lib/types/academic';
import type { EnrollmentDto, GuardianDto, StudentDetailDto } from '@/lib/types/students';
import { StudentProfileHero } from './student-profile-hero';
import { StudentProfileTabs } from './student-profile-tabs';

export default async function StudentProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;

  const student = await apiFetch<StudentDetailDto>(`/students/${id}`).catch(
    (error: unknown) => {
      if (error instanceof ApiError && error.status === 404) {
        notFound();
      }
      throw error;
    },
  );

  const [classes, sessions, guardians, enrollments, currentTerm] = await Promise.all([
    apiFetch<ClassDto[]>('/classes'),
    apiFetch<AcademicSessionDto[]>('/academic-sessions'),
    apiFetch<GuardianDto[]>('/guardians'),
    apiFetch<EnrollmentDto[]>(`/students/${id}/enrollments`),
    apiFetch<TermDto>('/terms/current'),
  ]);
  const [attendanceSummary, attendanceHistory, qrDataUrl] = await Promise.all([
    getAttendanceSummary(id, currentTerm.id),
    getStudentAttendanceHistory(id, currentTerm.startDate, currentTerm.endDate),
    student.qrToken ? generateQrDataUrl(student.qrToken) : Promise.resolve(null),
  ]);

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Link
          href="/admin/students"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Back to Student Directory
        </Link>
        <StudentProfileHero student={student} />
      </div>

      <StudentProfileTabs
        student={student}
        classes={classes}
        sessions={sessions}
        guardians={guardians}
        enrollments={enrollments}
        defaultTab={tab}
        currentTermName={currentTerm.name}
        attendanceSummary={attendanceSummary}
        attendanceHistory={attendanceHistory}
        qrDataUrl={qrDataUrl}
      />
    </div>
  );
}
