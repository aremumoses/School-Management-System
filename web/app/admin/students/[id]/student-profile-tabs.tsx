'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { AcademicSessionDto, ClassDto } from '@/lib/types/academic';
import type { AttendanceRecordDto, AttendanceSummaryDto } from '@/lib/types/attendance';
import type { EnrollmentDto, GuardianDto, StudentDetailDto } from '@/lib/types/students';
import { AcademicHistoryTab } from './academic-history-tab';
import { AttendanceTab } from './attendance-tab';
import { BioDataTab } from './bio-data-tab';
import { DocumentsTab } from './documents-tab';
import { GuardiansTab } from './guardians-tab';
import { IdCardTab } from './id-card-tab';

export function StudentProfileTabs({
  student,
  classes,
  sessions,
  guardians,
  enrollments,
  defaultTab,
  currentTermName,
  attendanceSummary,
  attendanceHistory,
  qrDataUrl,
}: {
  student: StudentDetailDto;
  classes: ClassDto[];
  sessions: AcademicSessionDto[];
  guardians: GuardianDto[];
  enrollments: EnrollmentDto[];
  defaultTab?: string;
  currentTermName: string;
  attendanceSummary: AttendanceSummaryDto;
  attendanceHistory: AttendanceRecordDto[];
  qrDataUrl: string | null;
}) {
  return (
    <Tabs defaultValue={defaultTab ?? 'bio-data'}>
      {/* overflow-x-auto: 6 tab labels can be wider than a 375px viewport —
          this scrolls just the tab bar instead of the whole page. */}
      <div className="overflow-x-auto">
        <TabsList className="w-full sm:w-fit">
          <TabsTrigger value="bio-data">Bio-data</TabsTrigger>
          <TabsTrigger value="guardians">Guardians</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="academic-history">Academic History</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="id-card">ID Card</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="bio-data" className="pt-4">
        <BioDataTab student={student} />
      </TabsContent>
      <TabsContent value="guardians" className="pt-4">
        <GuardiansTab student={student} allGuardians={guardians} />
      </TabsContent>
      <TabsContent value="documents" className="pt-4">
        <DocumentsTab student={student} />
      </TabsContent>
      <TabsContent value="academic-history" className="pt-4">
        <AcademicHistoryTab
          studentId={student.id}
          enrollments={enrollments}
          classes={classes}
          sessions={sessions}
        />
      </TabsContent>
      <TabsContent value="attendance" className="pt-4">
        <AttendanceTab
          termName={currentTermName}
          summary={attendanceSummary}
          history={attendanceHistory}
        />
      </TabsContent>
      <TabsContent value="id-card" className="pt-4">
        <IdCardTab student={student} qrDataUrl={qrDataUrl} />
      </TabsContent>
    </Tabs>
  );
}
