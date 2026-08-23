'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch } from '@/lib/api';
import type { StudentListResponse } from '@/lib/types/students';
import type {
  AttendanceRecordDto,
  AttendanceRegisterEntry,
  AttendanceRosterEntry,
  AttendanceSummaryDto,
  ChronicAbsenteeismEntryDto,
  MarkAttendanceInput,
  TeachingAssignmentDto,
} from '@/lib/types/attendance';

export async function markAttendance(input: MarkAttendanceInput): Promise<{ marked: number }> {
  const result = await apiFetch<{ marked: number }>('/attendance/mark', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  revalidatePath('/teacher/attendance');
  revalidatePath('/admin/attendance');
  return result;
}

export async function getMyTeachingAssignments(staffId: string): Promise<TeachingAssignmentDto[]> {
  return apiFetch<TeachingAssignmentDto[]>(`/staff/${staffId}/teaching-assignments`);
}

export async function getClassAttendance(
  armId: string,
  date: string,
  classSubjectId?: string,
): Promise<AttendanceRecordDto[]> {
  const query = new URLSearchParams({ date });
  if (classSubjectId) query.set('classSubjectId', classSubjectId);
  return apiFetch<AttendanceRecordDto[]>(`/attendance/class/${armId}?${query.toString()}`);
}

/** The roster for a marking context+date: every actively-enrolled student in the arm, with their existing record's status (defaulting to PRESENT when unmarked) — see prompts/stage-04-attendance §1's "default to Present for everyone." */
export async function getAttendanceRoster(
  armId: string,
  date: string,
  classSubjectId?: string,
): Promise<AttendanceRosterEntry[]> {
  const [studentsRes, records] = await Promise.all([
    apiFetch<StudentListResponse>(`/students?armId=${armId}&pageSize=100`),
    getClassAttendance(armId, date, classSubjectId),
  ]);
  const statusByStudentId = new Map(records.map((r) => [r.studentId, r.status]));
  return studentsRes.data.map((student) => ({
    studentId: student.id,
    firstName: student.firstName,
    lastName: student.lastName,
    admissionNumber: student.admissionNumber,
    photoUrl: student.photoUrl,
    status: statusByStudentId.get(student.id) ?? 'PRESENT',
  }));
}

/**
 * The Admin's class-day register: every actively-enrolled student in the
 * arm, with their real marked status — `null` (not defaulted to PRESENT)
 * when nobody has marked them yet, since this is a read-only audit view,
 * not the Teacher's marking screen.
 *
 * `classSubjectId` omitted = the whole-day register (only a Class Teacher
 * can produce this). Pass a specific classSubjectId to view a Subject
 * Teacher's per-period register instead — those are separate rows
 * entirely (see schema.prisma's Attendance comment), so a Subject
 * Teacher's marks never show up here unless this is explicitly pointed at
 * their period.
 */
export async function getAttendanceRegister(
  armId: string,
  date: string,
  classSubjectId?: string,
): Promise<AttendanceRegisterEntry[]> {
  const [studentsRes, records] = await Promise.all([
    apiFetch<StudentListResponse>(`/students?armId=${armId}&pageSize=100`),
    getClassAttendance(armId, date, classSubjectId),
  ]);
  const statusByStudentId = new Map(records.map((r) => [r.studentId, r.status]));
  return studentsRes.data.map((student) => ({
    studentId: student.id,
    firstName: student.firstName,
    lastName: student.lastName,
    admissionNumber: student.admissionNumber,
    status: statusByStudentId.get(student.id) ?? null,
  }));
}

export async function getStudentAttendanceHistory(
  studentId: string,
  from?: string,
  to?: string,
): Promise<AttendanceRecordDto[]> {
  const query = new URLSearchParams({ studentId });
  if (from) query.set('from', from);
  if (to) query.set('to', to);
  return apiFetch<AttendanceRecordDto[]>(`/attendance?${query.toString()}`);
}

export async function getAttendanceSummary(
  studentId: string,
  termId: string,
): Promise<AttendanceSummaryDto> {
  return apiFetch<AttendanceSummaryDto>(
    `/attendance/summary?studentId=${studentId}&termId=${termId}`,
  );
}

export async function getChronicAbsenteeism(
  termId: string,
  threshold: number,
): Promise<ChronicAbsenteeismEntryDto[]> {
  return apiFetch<ChronicAbsenteeismEntryDto[]>(
    `/attendance/chronic-absenteeism?termId=${termId}&threshold=${threshold}`,
  );
}
