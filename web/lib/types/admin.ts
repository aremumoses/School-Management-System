/** Types for the Admin dashboard and analytics endpoints. */

export interface DashboardSummaryDto {
  totalActiveStudents: number;
  totalActiveStaff: number;
  /** Today's school-wide attendance rate (0–100), based on daily records. null if none marked. */
  todayAttendanceRate: number | null;
  /** Current term's fee collection rate (0–100), or null if no current term / no invoices. */
  termCollectionRate: number | null;
  /** Number of (class, term) pairs currently in PENDING_APPROVAL stage */
  pendingResultApprovals: number;
  /** Number of SUSPENSION/EXPULSION actions in PROPOSED status */
  pendingSuspensionApprovals: number;
  /** Upcoming events starting within the next 7 days */
  upcomingEventsCount: number;
}

export interface PerformanceTrendPoint {
  termId: string;
  termName: string;
  averageScore: number;
  byClass: { classId: string; className: string; averageScore: number }[];
}

export interface SubjectPerformanceRow {
  subjectId: string;
  subjectName: string;
  averageScore: number;
  entryCount: number;
}

export interface TeacherPerformanceRow {
  staffId: string;
  staffName: string;
  classSubjectId: string;
  subjectName: string;
  className: string;
  averageScore: number;
  entryCount: number;
}

export interface AttendanceTrendPoint {
  termId: string;
  termName: string;
  attendanceRate: number;
  totalDays: number;
}

export interface AuditLogEntry {
  id: string;
  actorId: string | null;
  actorType: string;
  actorRole: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  beforeJson: unknown;
  afterJson: unknown;
  createdAt: string;
}

export interface AuditLogListResponse {
  data: AuditLogEntry[];
  total: number;
  page: number;
  pageSize: number;
}
