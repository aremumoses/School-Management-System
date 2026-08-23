export type NotificationItemType = 'BROADCAST' | 'MESSAGE';

export interface NotificationItem {
  type: NotificationItemType;
  id: string;
  conversationId?: string;
  title: string;
  preview: string;
  createdAt: Date;
  read: boolean;
}

export interface NotificationSummary {
  unreadCount: number;
  items: NotificationItem[];
}
