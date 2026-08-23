import { FileQuestion, FileText, Presentation, Video, type LucideIcon } from 'lucide-react';
import type { ResourceType } from '@/lib/types/resources';

export const RESOURCE_TYPE_LABELS: Record<ResourceType, string> = {
  NOTE: 'Notes',
  SLIDES: 'Slides',
  PAST_QUESTION: 'Past Questions',
  VIDEO_LINK: 'Video',
};

export const RESOURCE_TYPE_ICONS: Record<ResourceType, LucideIcon> = {
  NOTE: FileText,
  SLIDES: Presentation,
  PAST_QUESTION: FileQuestion,
  VIDEO_LINK: Video,
};
