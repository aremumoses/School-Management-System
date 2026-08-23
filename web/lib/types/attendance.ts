import type { components } from '@/types/api';

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED' | 'ON_LEAVE';

export type MarkAttendanceInput = components['schemas']['MarkAttendanceDto'];
export type AttendanceEntryInput = components['schemas']['AttendanceEntryDto'];

/**
 * Response shapes are hand-written against api/src/modules/attendance/attendance.service.ts's
 * actual return types — Swagger only annotates request bodies, not responses (same situation
 * as lib/types/academic.ts and lib/types/students.ts).
 */

export interface AttendanceArmRef {
  id: string;
  name: string;
  classId: string;
  class: { id: string; name: string; level: number };
}

export interface AttendanceRecordStudentRef {
  id: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
}

export interface AttendanceRecordDto {
  id: string;
  studentId: string;
  armId: string;
  termId: string;
  classSubjectId: string | null;
  date: string;
  status: AttendanceStatus;
  markedByStaffId: string;
  createdAt: string;
  updatedAt: string;
  // Present on GET /attendance (history) only.
  arm?: AttendanceArmRef;
  // Present on GET /attendance/class/:armId only.
  student?: AttendanceRecordStudentRef;
}

export interface AttendanceSummaryDto {
  studentId: string;
  termId: string;
  total: number;
  PRESENT: number;
  ABSENT: number;
  LATE: number;
  EXCUSED: number;
  ON_LEAVE: number;
  percentage: number;
}

export interface ChronicAbsenteeismStudentRef {
  id: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
}

export interface ChronicAbsenteeismEntryDto {
  studentId: string;
  student: ChronicAbsenteeismStudentRef | undefined;
  totalDays: number;
  absentDays: number;
  absenceRate: number;
}

/** One roster row in the Teacher's mark-attendance screen — merges the enrolled student with their existing record for the selected context+date, if any. */
export interface AttendanceRosterEntry {
  studentId: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  photoUrl: string | null;
  status: AttendanceStatus;
}

/** One row in the Admin's class-day register browser — unlike AttendanceRosterEntry (which defaults an unmarked student to PRESENT for the Teacher's marking screen), `status: null` here means genuinely not-yet-marked, since this is a read-only audit view, not a marking one. */
export interface AttendanceRegisterEntry {
  studentId: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  status: AttendanceStatus | null;
}

export interface TeachingAssignmentDto {
  id: string;
  staffId: string;
  classSubjectId: string;
  termId: string;
  scoreEntryDeadline: string | null;
  createdAt: string;
  classSubject: {
    id: string;
    classId: string;
    subjectId: string;
    class: { id: string; name: string; level: number };
    subject: { id: string; name: string; code: string | null };
  };
  term: { id: string; name: string; isCurrent: boolean; sessionId: string };
}
