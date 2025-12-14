'use client';

import { useState } from 'react';
import { Notification, NotificationFilter } from '@/types';
import { Sidebar, BottomNav } from '@/components/layout';
import {
  NotificationLoginPrompt,
  NotificationTabs,
  NotificationList,
} from '@/components/features/notifications';
import { dummyNotifications } from '@/constants';
import { useAuthStore } from '@/stores';

export default function NotificationsPage() {
  const [activeMenu, setActiveMenu] = useState('notification');
  const [activeFilter, setActiveFilter] = useState<NotificationFilter>('all');
  const { isLoggedIn, login } = useAuthStore();
  const [notifications, setNotifications] = useState<Notification[]>(dummyNotifications);

  const filteredNotifications = activeFilter === 'all'
    ? notifications
    : notifications.filter((n) => n.type === activeFilter);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const handleMarkAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      {/* Sidebar - hidden on mobile */}
      <Sidebar activeMenu={activeMenu} onMenuChange={setActiveMenu} />

      {/* Bottom Navigation - visible only on mobile */}
      <BottomNav activeMenu={activeMenu} onMenuChange={setActiveMenu} />

      {/* Main Content */}
      <main className="md:pl-[72px] lg:pl-60 transition-all duration-300">
        <div className="max-w-[800px] mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-6">
          {/* Page Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">알림</h1>
              <p className="text-gray-500 text-sm">
                {isLoggedIn && unreadCount > 0
                  ? `읽지 않은 알림 ${unreadCount}개`
                  : '새로운 소식을 확인하세요'}
              </p>
            </div>

            {isLoggedIn && unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
              >
                모두 읽음
              </button>
            )}
          </div>

          {!isLoggedIn ? (
            <NotificationLoginPrompt onLogin={login} />
          ) : (
            <div className="space-y-4">
              {/* Filter Tabs */}
              <NotificationTabs
                activeFilter={activeFilter}
                onFilterChange={setActiveFilter}
              />

              {/* Notification List */}
              <NotificationList
                notifications={filteredNotifications}
                onMarkAsRead={handleMarkAsRead}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
