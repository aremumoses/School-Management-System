import type { components } from '@/types/api';

export type CreateExamSessionInput = components['schemas']['CreateExamSessionDto'];
export type UpdateExamSessionInput = components['schemas']['UpdateExamSessionDto'];
export type CreateExamHallInput = components['schemas']['CreateExamHallDto'];
export type UpdateExamHallInput = components['schemas']['UpdateExamHallDto'];
export type AllocateSeatsInput = components['schemas']['AllocateSeatsDto'];
export type ManualSeatAllocationInput = components['schemas']['ManualSeatAllocationDto'];
export type AssignInvigilatorInput = components['schemas']['AssignInvigilatorDto'];
export type CreateExternalExamCandidateInput =
  components['schemas']['CreateExternalExamCandidateDto'];
export type UpdateExternalExamCandidateInput =
  components['schemas']['UpdateExternalExamCandidateDto'];
export type CreateMalpracticeIncidentInput =
  components['schemas']['CreateMalpracticeIncidentDto'];

export type ExternalExamBody = 'BECE' | 'WAEC' | 'NECO' | 'NABTEB' | 'JAMB';
export type ExternalExamCandidateStatus = 'PENDING' | 'REGISTERED' | 'WITHDRAWN';
export type InvigilationRole = 'LEAD' | 'ASSISTANT';

export interface ExamSessionDto {
  id: string;
  subjectId: string;
  subjectName: string;
  armId: string;
  armLabel: string;
  date: string;
  startTime: string;
  durationMinutes: number;
  termId: string;
  invigilatorCount: number;
  seatAllocationCount: number;
}

export interface ExamHallDto {
  id: string;
  name: string;
  capacity: number;
}

export interface SeatAllocationDto {
  id: string;
  examSessionId: string;
  studentId: string;
  hallId: string;
  seatNumber: number;
  student: { id: string; firstName: string; lastName: string; admissionNumber: string };
  hall: ExamHallDto;
}

export interface InvigilationDutyDto {
  id: string;
  examSessionId: string;
  staffId: string;
  role: InvigilationRole;
  staff: { id: string; firstName: string; lastName: string };
}

export interface RosterSessionDto {
  examSessionId: string;
  subjectName: string;
  armLabel: string;
  date: string;
  startTime: string;
  durationMinutes: number;
  invigilators: { staffId: string; staffName: string; role: InvigilationRole }[];
}

export interface ExternalExamCandidateDto {
  id: string;
  studentId: string;
  examBody: ExternalExamBody;
  sessionYear: number;
  subjectCombination: string[];
  registrationNumber: string | null;
  status: ExternalExamCandidateStatus;
  student: {
    id: string;
    admissionNumber: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    gender: string;
  };
}

export interface CaSummarySubjectDto {
  subjectName: string;
  components: { name: string; maxScore: number; weight: number; score: number | null }[];
  total: number;
  grade: string;
  remark: string;
}

export interface CaSummaryDto {
  studentId: string;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  termId: string;
  termName: string;
  subjects: CaSummarySubjectDto[];
}

export interface MalpracticeIncidentDto {
  id: string;
  examSessionId: string | null;
  cbtAttemptId: string | null;
  studentId: string;
  description: string;
  actionTaken: string;
  loggedByStaffId: string;
  loggedAt: string;
  student: { id: string; firstName: string; lastName: string; admissionNumber: string };
  loggedByStaff: { id: string; firstName: string; lastName: string };
  examSession: {
    subject: { name: string };
    arm: { name: string; class: { name: string } };
  } | null;
}

export interface PassRateRow {
  classSubjectId: string;
  className: string;
  subjectName: string;
  studentCount: number;
  average: number | null;
  passRate: number | null;
}

export interface SubjectComparisonRow {
  subjectId: string;
  subjectName: string;
  studentCount: number;
  average: number | null;
  passRate: number | null;
}
