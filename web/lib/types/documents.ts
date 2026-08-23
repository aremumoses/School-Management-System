import type { components } from '@/types/api';

export type GenerateDocumentInput = components['schemas']['GenerateDocumentDto'];

export type GeneratedDocumentType = 'TESTIMONIAL' | 'CERTIFICATE';
export type GeneratedDocumentStatus = 'DRAFT' | 'APPROVED';

export interface GeneratedDocumentDto {
  id: string;
  studentId: string;
  type: GeneratedDocumentType;
  status: GeneratedDocumentStatus;
  requestedByStaffId: string;
  url: string | null;
  generatedAt: string | null;
  approvedByStaffId: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
