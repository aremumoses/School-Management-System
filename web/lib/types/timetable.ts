import type { components } from '@/types/api';

/**
 * Request DTOs from the generated OpenAPI types; response shapes
 * hand-written against api/src/modules/timetable/timetable.service.ts —
 * same convention as every other lib/types/*.ts file here.
 */

export type CreatePeriodInput = components['schemas']['CreatePeriodDto'];
export type UpdatePeriodInput = components['schemas']['UpdatePeriodDto'];
export type CreateTimetableEntryInput = components['schemas']['CreateTimetableEntryDto'];
export type UpdateTimetableEntryInput = components['schemas']['UpdateTimetableEntryDto'];

export interface PeriodDto {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface TimetableEntryDto {
  id: string;
  armId: string;
  armLabel: string;
  classSubjectId: string;
  subjectName: string;
  teacherId: string | null;
  teacherName: string | null;
  periodId: string;
  /** ISO weekday: 1 = Monday … 7 = Sunday */
  dayOfWeek: number;
  termId: string;
  room: string | null;
}

export interface TimetableGridDto {
  termId: string;
  periods: PeriodDto[];
  entries: TimetableEntryDto[];
}

export interface MyTimetableGridDto extends TimetableGridDto {
  /** null when the student has no ACTIVE enrollment */
  armLabel: string | null;
}
