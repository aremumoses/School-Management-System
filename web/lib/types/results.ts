import type { components } from '@/types/api';

/**
 * Request DTOs from the generated OpenAPI types (source of truth: the
 * NestJS DTOs). Response shapes are hand-written against the actual
 * Prisma/service return types in api/src/modules/{assessment,scores,results,promotion}
 * — verified during Stage 5 backend work, not guessed (Swagger here only
 * annotates request bodies, not responses — same situation as every other
 * lib/types/*.ts file in this app).
 */

export type CreateAssessmentComponentInput = components['schemas']['CreateAssessmentComponentDto'];
export type UpdateAssessmentComponentInput = components['schemas']['UpdateAssessmentComponentDto'];
export type ScoreEntryInput = components['schemas']['ScoreEntryDto'];
export type SubmitScoresInput = components['schemas']['SubmitScoresDto'];
export type UnlockScoresInput = components['schemas']['UnlockScoresDto'];
export type ConductRatingEntryInput = components['schemas']['ConductRatingEntryDto'];
export type SubmitConductInput = components['schemas']['SubmitConductDto'];
export type PrincipalCommentInput = components['schemas']['PrincipalCommentDto'];
export type ReturnResultInput = components['schemas']['ReturnResultDto'];
export type GeneratePromotionSuggestionsInput = components['schemas']['GeneratePromotionSuggestionsDto'];
export type PromoteStudentInput = components['schemas']['PromoteStudentDto'];
export type SuggestCommentInput = components['schemas']['SuggestCommentDto'];

// Stage 30 — hand-written since the controller has no response DTO class.
export interface SuggestCommentResponse {
  suggestion: string;
}

// A thrown error from suggestComment's apiFetch call doesn't reliably
// survive the Server Action boundary to the client in a production build
// (Next.js's own docs recommend modeling "expected" failures — a rate
// limit, a down LLM provider — as a return value rather than a thrown
// error, precisely to avoid this). suggestComment catches internally and
// returns this discriminated union instead.
export type SuggestCommentResult =
  | { success: true; suggestion: string }
  | { success: false; error: string };

export type ConductDomain = 'AFFECTIVE' | 'PSYCHOMOTOR';
export type ResultStage =
  | 'SCORES_IN_PROGRESS'
  | 'PENDING_COLLATION'
  | 'PENDING_APPROVAL'
  | 'RETURNED'
  | 'APPROVED'
  | 'PUBLISHED';

export interface AssessmentComponentDto {
  id: string;
  name: string;
  maxScore: number;
  weight: number;
  termId: string;
  subjectId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ScoreGridComponentDto {
  id: string;
  name: string;
  maxScore: number;
  weight: number;
}

export interface ScoreGridCellDto {
  assessmentComponentId: string;
  name: string;
  maxScore: number;
  score: number | null;
}

export interface StudentScoreRowDto {
  studentId: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  photoUrl: string | null;
  scores: ScoreGridCellDto[];
  total: number;
  grade: string;
  remark: string;
}

/** GET /scores — everything the Teacher score-entry grid needs in one call. */
export interface ScoreGridResponseDto {
  locked: boolean;
  submittedAt: string | null;
  unlockReason: string | null;
  components: ScoreGridComponentDto[];
  rows: StudentScoreRowDto[];
}

export interface ScoreSubmissionDto {
  id: string;
  classSubjectId: string;
  termId: string;
  submittedByStaffId: string;
  locked: boolean;
  submittedAt: string;
  unlockedAt: string | null;
  unlockedByStaffId: string | null;
  unlockReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SubjectLockStatusDto {
  classSubjectId: string;
  subjectName: string;
  locked: boolean;
}

export interface ResultStatusDto {
  stage: ResultStage;
  returnReason: string | null;
  publishedAt: string | null;
  allSubjectsLocked: boolean;
  subjects: SubjectLockStatusDto[];
  outstandingSubjects: SubjectLockStatusDto[];
}

export interface SubjectResultRowDto {
  classSubjectId: string;
  subjectId: string;
  subjectName: string;
  componentScores: { name: string; score: number | null; maxScore: number }[];
  total: number;
  grade: string;
  remark: string;
  positionInSubject: number;
  classAverageForSubject: number;
}

export interface StudentBroadsheetRowDto {
  studentId: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  subjects: SubjectResultRowDto[];
  totalObtainable: number;
  totalScored: number;
  overallAverage: number;
  overallPosition: number;
  classSize: number;
  formTeacherComment: string | null;
  principalComment: string | null;
}

export interface BroadsheetResponseDto {
  status: ResultStatusDto;
  rows: StudentBroadsheetRowDto[];
}

export interface ClassTermResultStatusDto {
  id: string;
  armId: string;
  termId: string;
  stage: ResultStage;
  returnReason: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConductRatingDto {
  domain: ConductDomain;
  category: string;
  score: number;
}

export interface StudentConductRowDto {
  studentId: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  ratings: ConductRatingDto[];
  formTeacherComment: string | null;
}

export interface PromotionSuggestionDto {
  studentId: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  currentEnrollmentId: string;
  currentClassId: string;
  currentClassName: string;
  currentArmId: string;
  overallAverage: number | null;
  suggestedOutcome: 'PROMOTED' | 'REPEATED' | 'GRADUATED' | null;
  reason: string;
}

export interface TranscriptSubjectEntryDto {
  subjectName: string;
  total: number;
  grade: string;
  remark: string;
}

export interface TranscriptTermEntryDto {
  termId: string;
  armId: string;
  sessionName: string;
  termName: string;
  className: string;
  armName: string;
  enrollmentStatus: string;
  overallAverage: number | null;
  overallPosition: number | null;
  classSize: number | null;
  reportCardUrl: string | null;
  subjects: TranscriptSubjectEntryDto[];
}

export interface TranscriptResponseDto {
  student: { firstName: string; lastName: string; admissionNumber: string };
  terms: TranscriptTermEntryDto[];
}

/** The same data the PDF processor renders — used for the on-screen report-card preview. */
export interface ReportCardDataDto {
  school: {
    name: string;
    logoUrl: string | null;
    address: string | null;
    motto: string | null;
    registrationNumber: string | null;
    primaryColor: string;
    secondaryColor: string;
  };
  student: {
    firstName: string;
    lastName: string;
    admissionNumber: string;
    photoUrl: string | null;
    gender: string;
  };
  className: string;
  armName: string;
  termName: string;
  sessionName: string;
  subjects: SubjectResultRowDto[];
  componentNames: string[];
  totalObtainable: number;
  totalScored: number;
  overallAverage: number;
  overallPosition: number;
  classSize: number;
  attendance: { totalDays: number; presentDays: number; absentDays: number };
  affectiveRatings: { category: string; score: number }[];
  psychomotorRatings: { category: string; score: number }[];
  formTeacherComment: string | null;
  principalComment: string | null;
  nextTermResumptionDate: string | null;
}
