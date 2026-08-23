'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch } from '@/lib/api';
import type {
  AllocateBedInput,
  BedAllocationDto,
  BoarderHealthLogDto,
  BoarderRow,
  CreateHealthLogInput,
  CreateHostelInput,
  CreateInventoryItemInput,
  CreateLeaveRequestInput,
  CreateRoomInput,
  CreateRouteAssignmentInput,
  CreateRouteInput,
  CreateRouteStopInput,
  CreateTransportStaffRecordInput,
  CreateVehicleMaintenanceInput,
  DecideLeaveRequestInput,
  HostelDto,
  HostelInventoryItemDto,
  LeaveOutingRequestDto,
  LeaveRequestStatus,
  LogVisitationInput,
  MarkRollCallInput,
  MarkTransportAttendanceInput,
  ReconciliationRow,
  RoomDto,
  RollCallDto,
  RollCallSession,
  StudentRouteAssignmentDto,
  TransportAttendanceDto,
  TransportRouteDto,
  TransportRun,
  TransportStaffRecordDto,
  TransportStaffRole,
  VehicleDueSoonRow,
  VehicleMaintenanceRecordDto,
  VisitationDto,
} from '@/lib/types/hostel-transport';

function revalidateAll() {
  revalidatePath('/hostel-transport');
  revalidatePath('/hostel-transport/rooms');
  revalidatePath('/hostel-transport/boarders');
  revalidatePath('/hostel-transport/roll-call');
  revalidatePath('/hostel-transport/visitation');
  revalidatePath('/hostel-transport/inventory');
  revalidatePath('/hostel-transport/routes');
  revalidatePath('/hostel-transport/route-assignment');
  revalidatePath('/hostel-transport/drivers');
  revalidatePath('/hostel-transport/pickup-attendance');
  revalidatePath('/hostel-transport/maintenance');
  revalidatePath('/parent/leave-requests');
  revalidatePath('/parent/transport');
}

// --- Student search (bed allocation / route assignment pickers) ---

export interface StudentSearchRow {
  id: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
}

export async function searchStudents(query: string): Promise<StudentSearchRow[]> {
  const result = await apiFetch<{ data: StudentSearchRow[] }>(
    `/students?search=${encodeURIComponent(query)}&pageSize=10`,
  );
  return result.data;
}

// --- Hostels / Rooms / Beds ---

export async function listHostels(): Promise<HostelDto[]> {
  return apiFetch<HostelDto[]>('/hostel/hostels');
}

export async function createHostel(input: CreateHostelInput): Promise<HostelDto> {
  const hostel = await apiFetch<HostelDto>('/hostel/hostels', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  revalidateAll();
  return hostel;
}

export async function createRoom(input: CreateRoomInput): Promise<RoomDto> {
  const room = await apiFetch<RoomDto>('/hostel/rooms', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  revalidateAll();
  return room;
}

export async function allocateBed(
  roomId: string,
  input: AllocateBedInput,
): Promise<BedAllocationDto> {
  const allocation = await apiFetch<BedAllocationDto>(`/hostel/rooms/${roomId}/allocate`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  revalidateAll();
  return allocation;
}

export async function vacateBed(allocationId: string): Promise<void> {
  await apiFetch(`/hostel/bed-allocations/${allocationId}`, { method: 'DELETE' });
  revalidateAll();
}

export async function listBoarders(hostelId?: string, search?: string): Promise<BoarderRow[]> {
  const q = new URLSearchParams();
  if (hostelId) q.set('hostelId', hostelId);
  if (search) q.set('search', search);
  const qs = q.toString();
  return apiFetch<BoarderRow[]>(`/hostel/boarders${qs ? `?${qs}` : ''}`);
}

// --- Roll-call ---

export async function getRollCall(
  hostelId: string,
  date: string,
  session: RollCallSession,
): Promise<RollCallDto> {
  return apiFetch<RollCallDto>(
    `/hostel/roll-call?hostelId=${hostelId}&date=${date}&session=${session}`,
  );
}

export async function markRollCall(input: MarkRollCallInput): Promise<RollCallDto> {
  const result = await apiFetch<RollCallDto>('/hostel/roll-call', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  revalidateAll();
  return result;
}

// --- Visitation ---

export async function logVisitation(input: LogVisitationInput): Promise<VisitationDto> {
  const visitation = await apiFetch<VisitationDto>('/hostel/visitations', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  revalidateAll();
  return visitation;
}

export async function listVisitations(studentId?: string): Promise<VisitationDto[]> {
  const qs = studentId ? `?studentId=${studentId}` : '';
  return apiFetch<VisitationDto[]>(`/hostel/visitations${qs}`);
}

// --- Inventory ---

export async function createInventoryItem(
  input: CreateInventoryItemInput,
): Promise<HostelInventoryItemDto> {
  const item = await apiFetch<HostelInventoryItemDto>('/hostel/inventory', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  revalidateAll();
  return item;
}

export async function updateInventoryItem(
  id: string,
  input: { condition?: string; description?: string },
): Promise<HostelInventoryItemDto> {
  const item = await apiFetch<HostelInventoryItemDto>(`/hostel/inventory/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  revalidateAll();
  return item;
}

export async function listInventory(
  roomId?: string,
  studentId?: string,
): Promise<HostelInventoryItemDto[]> {
  const q = new URLSearchParams();
  if (roomId) q.set('roomId', roomId);
  if (studentId) q.set('studentId', studentId);
  const qs = q.toString();
  return apiFetch<HostelInventoryItemDto[]>(`/hostel/inventory${qs ? `?${qs}` : ''}`);
}

// --- Boarder health log ---

export async function createHealthLog(
  input: CreateHealthLogInput,
): Promise<BoarderHealthLogDto> {
  const log = await apiFetch<BoarderHealthLogDto>('/hostel/health-logs', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  revalidateAll();
  return log;
}

export async function listHealthLogs(studentId?: string): Promise<BoarderHealthLogDto[]> {
  const qs = studentId ? `?studentId=${studentId}` : '';
  return apiFetch<BoarderHealthLogDto[]>(`/hostel/health-logs${qs}`);
}

// --- Leave / outing requests ---

export async function createLeaveRequest(
  input: CreateLeaveRequestInput,
): Promise<LeaveOutingRequestDto> {
  const request = await apiFetch<LeaveOutingRequestDto>('/hostel/leave-requests', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  revalidateAll();
  return request;
}

export async function listMyLeaveRequests(): Promise<LeaveOutingRequestDto[]> {
  return apiFetch<LeaveOutingRequestDto[]>('/hostel/leave-requests/mine');
}

export async function listLeaveRequests(
  studentId?: string,
  status?: LeaveRequestStatus,
): Promise<LeaveOutingRequestDto[]> {
  const q = new URLSearchParams();
  if (studentId) q.set('studentId', studentId);
  if (status) q.set('status', status);
  const qs = q.toString();
  return apiFetch<LeaveOutingRequestDto[]>(`/hostel/leave-requests${qs ? `?${qs}` : ''}`);
}

export async function decideLeaveRequest(
  id: string,
  input: DecideLeaveRequestInput,
): Promise<LeaveOutingRequestDto> {
  const request = await apiFetch<LeaveOutingRequestDto>(`/hostel/leave-requests/${id}/decide`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  revalidateAll();
  return request;
}

// --- Routes & stops ---

export async function listRoutes(): Promise<TransportRouteDto[]> {
  return apiFetch<TransportRouteDto[]>('/transport/routes');
}

export async function getRoute(id: string): Promise<TransportRouteDto> {
  return apiFetch<TransportRouteDto>(`/transport/routes/${id}`);
}

export async function createRoute(input: CreateRouteInput): Promise<TransportRouteDto> {
  const route = await apiFetch<TransportRouteDto>('/transport/routes', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  revalidateAll();
  return route;
}

export async function createRouteStop(
  routeId: string,
  input: CreateRouteStopInput,
) {
  const stop = await apiFetch(`/transport/routes/${routeId}/stops`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  revalidateAll();
  return stop;
}

export async function deleteRouteStop(id: string): Promise<void> {
  await apiFetch(`/transport/stops/${id}`, { method: 'DELETE' });
  revalidateAll();
}

// --- Student-route assignment ---

export async function listRouteAssignments(routeId?: string): Promise<StudentRouteAssignmentDto[]> {
  const qs = routeId ? `?routeId=${routeId}` : '';
  return apiFetch<StudentRouteAssignmentDto[]>(`/transport/assignments${qs}`);
}

export async function assignStudentToRoute(
  input: CreateRouteAssignmentInput,
): Promise<StudentRouteAssignmentDto> {
  const assignment = await apiFetch<StudentRouteAssignmentDto>('/transport/assignments', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  revalidateAll();
  return assignment;
}

export async function removeRouteAssignment(studentId: string): Promise<void> {
  await apiFetch(`/transport/assignments/${studentId}`, { method: 'DELETE' });
  revalidateAll();
}

// --- Driver / conductor records ---

export async function listTransportStaffRecords(
  role?: TransportStaffRole,
): Promise<TransportStaffRecordDto[]> {
  const qs = role ? `?role=${role}` : '';
  return apiFetch<TransportStaffRecordDto[]>(`/transport/staff-records${qs}`);
}

export async function createTransportStaffRecord(
  input: CreateTransportStaffRecordInput,
): Promise<TransportStaffRecordDto> {
  const record = await apiFetch<TransportStaffRecordDto>('/transport/staff-records', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  revalidateAll();
  return record;
}

export async function updateTransportStaffRecord(
  id: string,
  input: Partial<CreateTransportStaffRecordInput>,
): Promise<TransportStaffRecordDto> {
  const record = await apiFetch<TransportStaffRecordDto>(`/transport/staff-records/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  revalidateAll();
  return record;
}

// --- Pickup/drop attendance ---

export async function getTransportAttendance(
  routeId: string,
  date: string,
  run: TransportRun,
): Promise<TransportAttendanceDto> {
  return apiFetch<TransportAttendanceDto>(
    `/transport/attendance?routeId=${routeId}&date=${date}&run=${run}`,
  );
}

export async function markTransportAttendance(
  input: MarkTransportAttendanceInput,
): Promise<TransportAttendanceDto> {
  const result = await apiFetch<TransportAttendanceDto>('/transport/attendance', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  revalidateAll();
  return result;
}

export async function getReconciliation(date: string): Promise<ReconciliationRow[]> {
  return apiFetch<ReconciliationRow[]>(`/transport/attendance/reconciliation?date=${date}`);
}

// --- Vehicle maintenance ---

export async function listMaintenanceRecords(
  busIdentifier?: string,
): Promise<VehicleMaintenanceRecordDto[]> {
  const qs = busIdentifier ? `?busIdentifier=${busIdentifier}` : '';
  return apiFetch<VehicleMaintenanceRecordDto[]>(`/transport/maintenance${qs}`);
}

export async function createMaintenanceRecord(
  input: CreateVehicleMaintenanceInput,
): Promise<VehicleMaintenanceRecordDto> {
  const record = await apiFetch<VehicleMaintenanceRecordDto>('/transport/maintenance', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  revalidateAll();
  return record;
}

export async function getMaintenanceDueSoon(): Promise<VehicleDueSoonRow[]> {
  return apiFetch<VehicleDueSoonRow[]>('/transport/maintenance/due-soon');
}
