import type { components } from '@/types/api';

/**
 * Request DTOs from the generated OpenAPI types (source of truth: the
 * NestJS DTOs). Response shapes are hand-written against the actual
 * Prisma return types in api/src/modules/students/**\/*.service.ts —
 * verified during Stage 3 backend work, not guessed (Swagger here only
 * annotates request bodies, not responses).
 */

export type CreateStudentInput = components['schemas']['CreateStudentDto'];
export type UpdateStudentInput = components['schemas']['UpdateStudentDto'];
export type LinkGuardianInput = components['schemas']['LinkGuardianDto'];
export type CreateEnrollmentInput = components['schemas']['CreateEnrollmentDto'];
export type UpdateEnrollmentInput = components['schemas']['UpdateEnrollmentDto'];
export type CreateGuardianInput = components['schemas']['CreateGuardianDto'];

export type Gender = 'MALE' | 'FEMALE';
export type EnrollmentStatus =
  | 'ACTIVE'
  | 'PROMOTED'
  | 'REPEATED'
  | 'TRANSFERRED'
  | 'WITHDRAWN'
  | 'GRADUATED';

export interface StudentDocument {
  id: string;
  type: string;
  url: string;
  uploadedAt: string;
}

export interface EnrollmentClassRef {
  id: string;
  name: string;
  level: number;
}

export interface EnrollmentArmRef {
  id: string;
  name: string;
  classId: string;
}

export interface EnrollmentSessionRef {
  id: string;
  name: string;
}

export interface EnrollmentTermRef {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  sessionId: string;
  session: EnrollmentSessionRef;
}

export interface EnrollmentDto {
  id: string;
  studentId: string;
  classId: string;
  armId: string;
  termId: string;
  status: EnrollmentStatus;
  createdAt: string;
  updatedAt: string;
  class: EnrollmentClassRef;
  arm: EnrollmentArmRef;
  term: EnrollmentTermRef;
}

export interface GuardianDto {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatedGuardianDto extends GuardianDto {
  temporaryPassword?: string;
}

export interface StudentGuardianLinkDto {
  id: string;
  studentId: string;
  guardianId: string;
  relationship: string;
  createdAt: string;
  guardian: GuardianDto;
  // Only present when linkGuardian created a brand-new guardian (not when
  // linking an existing one) — shown once, the same as every other
  // generated-credential flow in this app.
  guardianTemporaryPassword?: string;
}

export interface StudentDto {
  id: string;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  email: string | null;
  dateOfBirth: string;
  gender: Gender;
  stateOfOrigin: string | null;
  lga: string | null;
  religion: string | null;
  bloodGroup: string | null;
  genotype: string | null;
  address: string | null;
  photoUrl: string | null;
  // Stage 29 digital ID — encoded client-side as a QR code (see
  // components/students/id-card.tsx). Not a bearer credential on its own:
  // GET /students/qr/:qrToken is separately role-gated (front desk/admin/
  // hostel warden only), so knowing the raw value doesn't grant anything.
  qrToken: string | null;
  documents: StudentDocument[] | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // Present on both list and detail: the single ACTIVE enrollment, if any.
  enrollments: EnrollmentDto[];
}

export interface StudentDetailDto extends StudentDto {
  // Only present on GET /students/:id, not the list endpoint.
  guardians: StudentGuardianLinkDto[];
}

export interface CreatedStudentDto extends StudentDto {
  temporaryPassword?: string;
}

export interface StudentListResponse {
  data: StudentDto[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ValidStudentImportRow {
  rowNumber: number;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: Gender;
  stateOfOrigin: string | null;
  lga: string | null;
  religion: string | null;
  bloodGroup: string | null;
  genotype: string | null;
  address: string | null;
  className: string;
  armName: string;
  classId: string;
  armId: string;
  guardianFirstName: string;
  guardianLastName: string;
  guardianEmail: string;
  guardianPhone: string | null;
  guardianRelationship: string;
}

export interface InvalidStudentImportRow {
  rowNumber: number;
  data: Record<string, string>;
  errors: string[];
}

export interface BulkImportPreviewResponse {
  valid: ValidStudentImportRow[];
  invalid: InvalidStudentImportRow[];
}

export interface BulkImportCommitRowResult {
  rowNumber: number;
  success: boolean;
  studentId?: string;
  admissionNumber?: string;
  error?: string;
}

export interface BulkImportCommitResponse {
  results: BulkImportCommitRowResult[];
  succeededCount: number;
  failedCount: number;
}

// Stage 29 early-warning at-risk flagging — GET /students/at-risk.
export type AtRiskReason = 'ATTENDANCE' | 'CA' | 'BOTH';

export interface AtRiskStudentDto {
  studentId: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  reason: AtRiskReason;
  attendanceRate: number | null;
  caAverage: number | null;
  flaggedAt: string;
}
