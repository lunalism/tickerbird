'use client';

import { Notification, NotificationType } from '@/types';

interface NotificationListProps {
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
}

const typeIcons: Record<NotificationType, { emoji: string; bgColor: string }> = {
  watchlist: { emoji: '⭐', bgColor: 'bg-yellow-100' },
  news: { emoji: '📰', bgColor: 'bg-blue-100' },
  community: { emoji: '💬', bgColor: 'bg-green-100' },
};

export function NotificationList({ notifications, onMarkAsRead }: NotificationListProps) {
  if (notifications.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </div>
        <p className="text-gray-500">새로운 알림이 없습니다</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-50">
      {notifications.map((notification) => {
        const typeConfig = typeIcons[notification.type];
        return (
          <div
            key={notification.id}
            onClick={() => !notification.isRead && onMarkAsRead(notification.id)}
            className={`flex items-center gap-4 p-4 cursor-pointer transition-colors ${
              notification.isRead
                ? 'bg-gray-50/50 hover:bg-gray-100/50'
                : 'bg-white hover:bg-blue-50/50'
            }`}
          >
            {/* Type Icon */}
            <div className={`w-10 h-10 ${typeConfig.bgColor} rounded-full flex items-center justify-center flex-shrink-0`}>
              <span className="text-lg">{typeConfig.emoji}</span>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className={`text-sm ${notification.isRead ? 'text-gray-600' : 'text-gray-900 font-medium'}`}>
                {notification.title}
              </p>
              <p className="text-xs text-gray-400 mt-1">{notification.createdAt}</p>
            </div>

            {/* Unread Indicator */}
            {!notification.isRead && (
              <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0" />
            )}
          </div>
        );
      })}
    </div>
  );
}
