import type { components } from '@/types/api';

export type ApplyInput = components['schemas']['ApplyDto'];
export type ReviewInput = components['schemas']['ReviewApplicantDto'];
export type ConvertInput = components['schemas']['ConvertApplicantDto'];

export type ApplicantStatus =
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'CONVERTED';

export interface AdmissionFeeTransactionDto {
  id: string;
  reference: string;
  amount: number;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  authorizationUrl: string | null;
  createdAt: string;
}

export interface ApplicantDto {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  address: string | null;
  intendedClassLevel: string;
  guardianFirstName: string;
  guardianLastName: string;
  guardianEmail: string;
  guardianPhone: string;
  status: ApplicantStatus;
  applicationFeePaid: boolean;
  reviewerNotes: string | null;
  offerLetterUrl: string | null;
  convertedStudentId: string | null;
  feeTransactions: AdmissionFeeTransactionDto[];
  submittedAt: string;
  createdAt: string;
  updatedAt: string;
}

/** Minimal shape returned by the public GET /admissions/status/:id endpoint */
export interface ApplicantStatusDto {
  id: string;
  firstName: string;
  lastName: string;
  status: ApplicantStatus;
  applicationFeePaid: boolean;
  offerLetterUrl: string | null;
}
