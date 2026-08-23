import type { components } from '@/types/api';

// --- Request DTOs (from the generated OpenAPI schema) ---

export type CreateHostelInput = components['schemas']['CreateHostelDto'];
export type CreateRoomInput = components['schemas']['CreateRoomDto'];
export type AllocateBedInput = components['schemas']['AllocateBedDto'];
export type MarkRollCallInput = components['schemas']['MarkRollCallDto'];
export type LogVisitationInput = components['schemas']['LogVisitationDto'];
export type CreateInventoryItemInput = components['schemas']['CreateInventoryItemDto'];
export type CreateHealthLogInput = components['schemas']['CreateHealthLogDto'];
export type CreateLeaveRequestInput = components['schemas']['CreateLeaveRequestDto'];
export type DecideLeaveRequestInput = components['schemas']['DecideLeaveRequestDto'];
export type CreateRouteInput = components['schemas']['CreateRouteDto'];
export type CreateRouteStopInput = components['schemas']['CreateRouteStopDto'];
export type CreateRouteAssignmentInput = components['schemas']['CreateRouteAssignmentDto'];
export type CreateTransportStaffRecordInput =
  components['schemas']['CreateTransportStaffRecordDto'];
export type MarkTransportAttendanceInput = components['schemas']['MarkTransportAttendanceDto'];
export type CreateVehicleMaintenanceInput = components['schemas']['CreateVehicleMaintenanceDto'];

// --- Shared enums ---

export type RollCallSession = 'MORNING' | 'EVENING';
export type InventoryCondition = 'GOOD' | 'FAIR' | 'DAMAGED' | 'LOST';
export type LeaveRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type TransportStaffRole = 'DRIVER' | 'CONDUCTOR';
export type TransportRun = 'PICKUP' | 'DROPOFF';

// --- Part A: Hostel ---

export interface HostelStaffRef {
  id: string;
  firstName: string;
  lastName: string;
}

export interface StudentRef {
  id: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
}

export interface BedAllocationDto {
  id: string;
  roomId: string;
  bedNumber: number;
  studentId: string;
  allocatedAt: string;
  student: StudentRef;
}

export interface RoomDto {
  id: string;
  hostelId: string;
  roomNumber: string;
  bedCapacity: number;
  bedAllocations: BedAllocationDto[];
}

export interface HostelDto {
  id: string;
  name: string;
  wardenStaffId: string | null;
  warden: HostelStaffRef | null;
  rooms: RoomDto[];
}

export interface BoarderRow {
  studentId: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  className: string | null;
  armName: string | null;
  hostelId: string;
  hostelName: string;
  roomNumber: string;
  bedNumber: number;
  allocatedAt: string;
}

export interface RollCallEntryDto {
  studentId: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  present: boolean;
  unapprovedAbsence: boolean;
}

export interface RollCallDto {
  id: string | null;
  hostelId: string;
  hostelName: string;
  date: string;
  session: RollCallSession;
  entries: RollCallEntryDto[];
}

export interface VisitationDto {
  id: string;
  studentId: string;
  visitorName: string;
  relationship: string;
  visitedAt: string;
  matchedAuthorizedPickupPerson: boolean;
  loggedByStaffId: string;
  student: StudentRef;
  loggedBy: HostelStaffRef;
}

export interface HostelInventoryItemDto {
  id: string;
  roomId: string | null;
  studentId: string | null;
  description: string;
  condition: InventoryCondition;
  assignedAt: string;
  room?: { roomNumber: string; hostel: { name: string } } | null;
  student?: StudentRef | null;
}

export interface BoarderHealthLogDto {
  id: string;
  studentId: string;
  occurredAt: string;
  description: string;
  actionTaken: string;
  student: StudentRef;
  loggedBy: HostelStaffRef;
}

export interface LeaveOutingRequestDto {
  id: string;
  studentId: string;
  fromDate: string;
  toDate: string;
  reason: string;
  status: LeaveRequestStatus;
  decisionNotes: string | null;
  decidedAt: string | null;
  student: StudentRef;
  requestedBy: { id: string; firstName: string; lastName: string };
  decidedBy: HostelStaffRef | null;
}

// --- Part B: Transport ---

export interface TransportStaffRecordDto {
  id: string;
  name: string;
  role: TransportStaffRole;
  phone: string;
  licenseNumber: string | null;
  licenseExpiryDate: string | null;
  verified: boolean;
}

export interface RouteStopDto {
  id: string;
  routeId: string;
  stopName: string;
  order: number;
  approximateTime: string | null;
}

export interface TransportRouteDto {
  id: string;
  name: string;
  busIdentifier: string;
  driverId: string | null;
  conductorId: string | null;
  driver: TransportStaffRecordDto | null;
  conductor: TransportStaffRecordDto | null;
  stops: RouteStopDto[];
  _count: { studentAssignments: number };
}

export interface StudentRouteAssignmentDto {
  id: string;
  studentId: string;
  routeId: string;
  stopId: string;
  student: StudentRef;
  route: TransportRouteDto;
  stop: RouteStopDto;
}

export interface TransportAttendanceEntryDto {
  studentId: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  stopName: string;
  boarded: boolean;
}

export interface TransportAttendanceDto {
  id: string | null;
  routeId: string;
  routeName: string;
  date: string;
  run: TransportRun;
  entries: TransportAttendanceEntryDto[];
}

export interface ReconciliationRow {
  studentId: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  routeName: string;
}

export interface VehicleMaintenanceRecordDto {
  id: string;
  busIdentifier: string;
  serviceDate: string;
  description: string;
  cost: number;
  nextServiceDueDate: string | null;
  loggedBy: HostelStaffRef;
}

export interface VehicleDueSoonRow {
  busIdentifier: string;
  nextServiceDueDate: string;
  daysUntilDue: number;
  recordId: string;
}
