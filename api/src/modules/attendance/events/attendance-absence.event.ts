import type { AttendanceStatus } from '@prisma/client';

export const ATTENDANCE_ABSENCE_EVENT = 'attendance.absence';

/**
 * Emitted once per ABSENT/LATE entry on every mark — Stage 7's
 * notifications module subscribes to this to send the real SMS/push.
 * Deliberately a plain data event (no notification logic here) so this
 * module stays decoupled from however that gets delivered.
 */
export class AttendanceAbsenceEvent {
  constructor(
    public readonly studentId: string,
    public readonly armId: string,
    public readonly termId: string,
    public readonly date: string,
    public readonly status: Extract<AttendanceStatus, 'ABSENT' | 'LATE'>,
    public readonly markedByStaffId: string,
  ) {}
}
