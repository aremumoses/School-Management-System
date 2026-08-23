import type { components } from '@/types/api';

export type CreateClubInput = components['schemas']['CreateClubDto'];
export type UpdateClubInput = components['schemas']['UpdateClubDto'];
export type CreateConsentFormInput = components['schemas']['CreateConsentFormDto'];
export type RespondConsentFormInput = components['schemas']['RespondConsentFormDto'];

export interface ClubDto {
  id: string;
  name: string;
  description: string | null;
  meetingSchedule: string | null;
  patronStaffId: string | null;
  patron: { id: string; firstName: string; lastName: string } | null;
  _count: { memberships: number };
  createdAt: string;
}

export interface ClubDetailDto extends ClubDto {
  memberships: {
    id: string;
    joinedAt: string;
    student: {
      id: string;
      firstName: string;
      lastName: string;
      admissionNumber: string;
    };
  }[];
}

export interface MyClubDto {
  membershipId: string;
  joinedAt: string;
  id: string;
  name: string;
  description: string | null;
  meetingSchedule: string | null;
  patron: { firstName: string; lastName: string } | null;
}

export type ConsentFormType = 'EXCURSION' | 'MEDICAL' | 'PHOTO_VIDEO' | 'OTHER';
export type ConsentResponseValue = 'CONSENTED' | 'DECLINED';

export interface ConsentFormDto {
  id: string;
  title: string;
  description: string;
  type: ConsentFormType;
  targetType: 'CLASS' | 'WHOLE_SCHOOL';
  targetArmId: string | null;
  createdByStaffId: string;
  createdBy: { firstName: string; lastName: string };
  createdAt: string;
}

/** Staff list rows. */
export interface ConsentFormRowDto extends ConsentFormDto {
  armLabel: string | null;
  tally: { consented: number; declined: number; noResponse: number };
}

/** Guardian list rows — one per (form, ward). */
export interface GuardianConsentFormDto extends ConsentFormDto {
  student: { id: string; firstName: string; lastName: string };
  myResponse: {
    id: string;
    response: ConsentResponseValue;
    signatureName: string;
    respondedAt: string;
  } | null;
}

export interface ConsentRespondentRowDto {
  studentId: string;
  studentName: string;
  admissionNumber: string;
  guardianName: string | null;
  response: ConsentResponseValue | null;
  signatureName: string | null;
  respondedAt: string | null;
}

export interface ConsentResponsesDto {
  tally: { consented: number; declined: number; noResponse: number };
  respondents: ConsentRespondentRowDto[];
}
