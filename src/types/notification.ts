export type NotificationType = 'watchlist' | 'news' | 'community';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  createdAt: string;
  isRead: boolean;
}

export type NotificationFilter = 'all' | 'watchlist' | 'news' | 'community';
