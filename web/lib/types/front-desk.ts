import type { components } from '@/types/api';

export type AddPickupPersonInput = components['schemas']['AddPickupPersonDto'];
export type CreatePickupRequestInput = components['schemas']['CreatePickupRequestDto'];
export type SignInVisitorInput = components['schemas']['SignInVisitorDto'];
export type IssueGatePassInput = components['schemas']['IssueGatePassDto'];
export type LogLateArrivalInput = components['schemas']['LogLateArrivalDto'];
export type LogFacilityIncidentInput = components['schemas']['LogFacilityIncidentDto'];
export type LogAssetMovementInput = components['schemas']['LogAssetMovementDto'];

export type GatePassStatus = 'ISSUED' | 'ESCALATED' | 'REJECTED';
export type FacilityIncidentType =
  | 'UNAUTHORIZED_ENTRY'
  | 'ALTERCATION'
  | 'LOST_ITEM'
  | 'OTHER';
export type AssetDirection = 'OUT' | 'IN';
export type PickupRequestStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED';

interface StudentRef {
  id: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
}

export interface PickupPersonDto {
  id: string;
  name: string;
  phone: string;
  relationship: string;
  photoUrl: string | null;
  studentId: string;
  createdAt: string;
}

export interface PickupRequestDto {
  id: string;
  studentId: string;
  guardianId: string;
  pickupTime: string;
  reason: string;
  status: PickupRequestStatus;
  createdAt: string;
  student: StudentRef;
  guardian?: { firstName: string; lastName: string; phone: string | null };
}

export interface VisitorDto {
  id: string;
  name: string;
  phone: string;
  reason: string;
  photoUrl: string | null;
  hostStaffId: string | null;
  hostStaff: { firstName: string; lastName: string } | null;
  signedInAt: string;
  signedOutAt: string | null;
}

export interface GatePassDto {
  id: string;
  studentId: string;
  pickupPersonName: string;
  pickupPersonPhone: string | null;
  verifiedAgainstAuthorizedList: boolean;
  status: GatePassStatus;
  issuedAt: string;
  resolvedAt: string | null;
  student: StudentRef;
  issuedBy?: { firstName: string; lastName: string };
}

export interface LateArrivalDto {
  id: string;
  studentId: string;
  arrivalTime: string;
  notifiedClassTeacher: boolean;
  loggedAt: string;
  student: StudentRef;
}

export interface FacilityIncidentDto {
  id: string;
  type: FacilityIncidentType;
  description: string;
  partiesInvolved: string | null;
  actionTaken: string | null;
  loggedAt: string;
  loggedBy: { firstName: string; lastName: string };
}

export interface AssetMovementDto {
  id: string;
  assetDescription: string;
  direction: AssetDirection;
  reason: string | null;
  loggedAt: string;
  loggedBy: { firstName: string; lastName: string };
}

export interface FrontDeskOverviewDto {
  visitorCount: number;
  currentlySignedIn: number;
  studentsOutOnGatePass: number;
  lateArrivalCount: number;
  pendingPickupRequests: number;
  escalatedGatePasses: number;
}

// Stage 29 digital ID — GET /students/qr/:qrToken's response. Hand-written
// (not from the OpenAPI schema) for the same reason as every other
// response type in this file: the backend controller has no explicit
// response DTO class for Swagger to describe.
export interface QrResolveResponse {
  student: StudentRef & { photoUrl: string | null; isActive: boolean; className: string | null };
  pickupPersons: PickupPersonDto[];
}
