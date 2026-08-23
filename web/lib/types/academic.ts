import type { components } from '@/types/api';

/**
 * Request DTOs come straight from the generated OpenAPI types (source of
 * truth: the NestJS controllers' class-validator DTOs) — see
 * `npm run generate:api-types`. The NestJS Swagger setup doesn't annotate
 * response shapes, so response interfaces below are hand-written against
 * the actual Prisma return types in api/src/modules/academic/**\/*.service.ts
 * and api/src/modules/school/school.service.ts (verified, not guessed).
 */

export type UpdateSchoolInput = components['schemas']['UpdateSchoolDto'];
export type GradingScaleEntry = components['schemas']['GradingScaleEntryDto'];
export type CaWeightingEntry = components['schemas']['CaWeightingEntryDto'];
export type UpdateGradingScaleInput = components['schemas']['UpdateGradingScaleDto'];
export type CreateSessionInput = components['schemas']['CreateSessionDto'];
export type CreateTermInput = components['schemas']['CreateTermDto'];
export type UpdateTermInput = components['schemas']['UpdateTermDto'];
export type CreateClassInput = components['schemas']['CreateClassDto'];
export type UpdateClassInput = components['schemas']['UpdateClassDto'];
export type CreateArmInput = components['schemas']['CreateArmDto'];
export type UpdateArmInput = components['schemas']['UpdateArmDto'];
export type CreateSubjectInput = components['schemas']['CreateSubjectDto'];
export type UpdateSubjectInput = components['schemas']['UpdateSubjectDto'];
export type MapSubjectToClassInput = components['schemas']['MapSubjectToClassDto'];

export interface SchoolDto {
  id: string;
  name: string;
  logoUrl: string | null;
  address: string | null;
  registrationNumber: string | null;
  motto: string | null;
  documentPrimaryColor: string | null;
  documentSecondaryColor: string | null;
  gradingScale: GradingScaleEntry[] | null;
  caWeighting: CaWeightingEntry[] | null;
  /** Phase 2 modules toggled on for this school — controls sidebar nav visibility only. */
  enabledModules: string[];
  applicationFeeAmount: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface TermDto {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  sessionId: string;
  createdAt: string;
  updatedAt: string;
}

export interface AcademicSessionDto {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  terms: TermDto[];
}

export interface ArmClassTeacherRef {
  id: string;
  firstName: string;
  lastName: string;
}

export interface ArmDto {
  id: string;
  name: string;
  classId: string;
  classTeacherId: string | null;
  classTeacher: ArmClassTeacherRef | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClassDto {
  id: string;
  name: string;
  level: number;
  createdAt: string;
  updatedAt: string;
  arms: ArmDto[];
}

export interface ClassSubjectDto {
  id: string;
  classId: string;
  subjectId: string;
  createdAt: string;
  class: ClassDto;
}

export interface SubjectDto {
  id: string;
  name: string;
  code: string | null;
  createdAt: string;
  updatedAt: string;
  classSubjects: ClassSubjectDto[];
}
