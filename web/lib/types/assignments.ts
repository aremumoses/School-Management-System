import type { components } from '@/types/api';

/**
 * Request DTOs from the generated OpenAPI types; response shapes
 * hand-written against api/src/modules/assignments — same convention as
 * every other lib/types/*.ts file.
 */

export type CreateAssignmentInput = components['schemas']['CreateAssignmentDto'];
export type UpdateAssignmentInput = components['schemas']['UpdateAssignmentDto'];
export type SubmitAssignmentInput = components['schemas']['SubmitAssignmentDto'];
export type GradeSubmissionInput = components['schemas']['GradeSubmissionDto'];

export interface SubmissionDto {
  id: string;
  assignmentId: string;
  studentId: string;
  textResponse: string | null;
  fileUrl: string | null;
  submittedAt: string;
  grade: string | null;
  feedback: string | null;
  gradedAt: string | null;
  gradedByStaffId: string | null;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    admissionNumber: string;
  };
  gradedBy: { firstName: string; lastName: string } | null;
}

export interface AssignmentDto {
  id: string;
  classSubjectId: string;
  title: string;
  instructions: string;
  dueDate: string;
  allowLateSubmission: boolean;
  attachmentUrl: string | null;
  createdByStaffId: string;
  createdAt: string;
  classSubject: {
    id: string;
    classId: string;
    subject: { id: string; name: string };
    class: { id: string; name: string };
  };
  createdBy: { firstName: string; lastName: string };
}

/** Teacher/admin list rows. */
export interface TeacherAssignmentRowDto extends AssignmentDto {
  submissionCount: number;
}

/** Student list rows / detail — own submission attached (null = not submitted). */
export interface StudentAssignmentDto extends AssignmentDto {
  submission: SubmissionDto | null;
}

/** Parent list rows — student says which ward the row belongs to. */
export interface WardAssignmentDto extends StudentAssignmentDto {
  student: { id: string; firstName: string; lastName: string };
}

/** Teacher/admin detail — every submission. */
export interface AssignmentDetailDto extends AssignmentDto {
  submissions: SubmissionDto[];
}

export interface GradebookStudentRowDto {
  studentId: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  perTerm: { termId: string; termName: string; average: number | null }[];
  overallAverage: number | null;
  atRisk: boolean;
}

export interface GradebookDto {
  classSubjectId: string;
  subjectName: string;
  className: string;
  sessionId: string;
  threshold: number;
  terms: { termId: string; termName: string }[];
  students: GradebookStudentRowDto[];
  classAverage: number | null;
  highest: number | null;
  lowest: number | null;
  distribution: { range: string; count: number }[];
}
