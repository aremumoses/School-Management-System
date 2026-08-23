import type { AttendanceStatus } from '@/lib/types/attendance';

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  PRESENT: 'Present',
  ABSENT: 'Absent',
  LATE: 'Late',
  EXCUSED: 'Excused',
  ON_LEAVE: 'On Leave',
};

export const ATTENDANCE_STATUS_SHORT_LABELS: Record<AttendanceStatus, string> = {
  PRESENT: 'P',
  ABSENT: 'A',
  LATE: 'L',
  EXCUSED: 'E',
  ON_LEAVE: 'OL',
};

/** Badge/control variant per status — matches prompts/00-DESIGN-SYSTEM.md §2's semantic palette. */
export const ATTENDANCE_STATUS_BADGE: Record<AttendanceStatus, 'success' | 'warning' | 'error' | 'info'> = {
  PRESENT: 'success',
  ABSENT: 'error',
  LATE: 'warning',
  EXCUSED: 'info',
  ON_LEAVE: 'info',
};

/** The 4 statuses a Teacher marks day-to-day — ON_LEAVE is reserved for the Hostel/Transport modules' own attendance flows (docs/02-feature-list.md §6, §13/§14), not this segmented control. */
export const TEACHER_MARKABLE_STATUSES: AttendanceStatus[] = ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'];
