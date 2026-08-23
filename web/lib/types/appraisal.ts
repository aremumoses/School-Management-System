import type { components } from '@/types/api';

// --- Request DTOs (from the generated OpenAPI schema) ---

export type UpsertAppraisalFormInput = components['schemas']['UpsertAppraisalFormDto'];
export type CreateAppraisalCycleInput = components['schemas']['CreateAppraisalCycleDto'];
export type UpdateAppraisalCycleStatusInput =
  components['schemas']['UpdateAppraisalCycleStatusDto'];
export type CreateAppraisalSubmissionInput =
  components['schemas']['CreateAppraisalSubmissionDto'];

// --- Shared enums ---

export type AppraisalCycleStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED';
export type AppraisalSubmissionStatus = 'DRAFT' | 'SUBMITTED' | 'SIGNED_OFF';

interface StaffRef {
  id: string;
  firstName: string;
  lastName: string;
}

export interface RatedCategory {
  key: string;
  label: string;
  maxScore: number;
}

export interface FreeTextSection {
  key: string;
  label: string;
}

export interface AppraisalFormDto {
  id: string;
  name: string;
  sections: {
    ratedCategories: RatedCategory[];
    freeTextSections: FreeTextSection[];
  };
  createdAt: string;
}

export interface AppraisalCycleDto {
  id: string;
  name: string;
  periodStart: string;
  periodEnd: string;
  status: AppraisalCycleStatus;
  formId: string;
  _count?: { submissions: number };
}

export interface AppraisalCycleDetailDto extends AppraisalCycleDto {
  form: AppraisalFormDto;
  submissions: AppraisalSubmissionDto[];
}

/** { [categoryKey]: number } / { [sectionKey]: string } */
export interface AppraisalResponses {
  ratings: Record<string, number>;
  freeText: Record<string, string>;
}

export interface AppraisalSubmissionDto {
  id: string;
  cycleId: string;
  staffId: string;
  reviewerId: string;
  responses: AppraisalResponses;
  status: AppraisalSubmissionStatus;
  submittedAt: string | null;
  signedOffByStaffId: string | null;
  signedOffAt: string | null;
  createdAt: string;
  staff?: StaffRef;
  reviewer?: StaffRef;
  cycle?: AppraisalCycleDto & { form: AppraisalFormDto };
}

export interface SaveAppraisalResponsesInput extends AppraisalResponses {
  submit?: boolean;
}
