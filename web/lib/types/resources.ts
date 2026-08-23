import type { components } from '@/types/api';

export type CreateResourceInput = components['schemas']['CreateResourceDto'];

export type ResourceType = 'NOTE' | 'SLIDES' | 'PAST_QUESTION' | 'VIDEO_LINK';

export interface ResourceDto {
  id: string;
  title: string;
  topic: string | null;
  type: ResourceType;
  fileUrl: string | null;
  externalUrl: string | null;
  subjectId: string;
  classId: string;
  uploadedByStaffId: string;
  createdAt: string;
  subject: { id: string; name: string };
  class: { id: string; name: string };
  uploadedBy: { firstName: string; lastName: string };
}
