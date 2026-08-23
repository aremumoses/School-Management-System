import { Gender } from '@prisma/client';

/** A row that passed every validation check during preview — exactly what commit expects back. */
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

/** A row that failed validation — surfaced to the admin so they can fix the spreadsheet, never silently dropped. */
export interface InvalidStudentImportRow {
  rowNumber: number;
  data: Record<string, string>;
  errors: string[];
}

export interface BulkImportPreviewResult {
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

export interface BulkImportCommitResult {
  results: BulkImportCommitRowResult[];
  succeededCount: number;
  failedCount: number;
}
