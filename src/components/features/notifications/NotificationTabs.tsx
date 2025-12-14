'use client';

import { NotificationFilter } from '@/types';
import { notificationFilters } from '@/constants';

interface NotificationTabsProps {
  activeFilter: NotificationFilter;
  onFilterChange: (filter: NotificationFilter) => void;
}

export function NotificationTabs({ activeFilter, onFilterChange }: NotificationTabsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {notificationFilters.map((filter) => (
        <button
          key={filter.id}
          onClick={() => onFilterChange(filter.id)}
          className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
            activeFilter === filter.id
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
}
