'use client';

import { ActivitySummary } from '@/types';

interface ActivitySummaryCardProps {
  activity: ActivitySummary;
}

export function ActivitySummaryCard({ activity }: ActivitySummaryCardProps) {
  const items = [
    { emoji: '📝', label: '작성글', value: activity.posts },
    { emoji: '💬', label: '댓글', value: activity.comments },
    { emoji: '⭐', label: '관심종목', value: activity.watchlist },
  ];

  return (
    <div className="grid grid-cols-3 gap-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="bg-white rounded-2xl border border-gray-100 p-6 text-center"
        >
          <span className="text-3xl mb-2 block">{item.emoji}</span>
          <p className="text-2xl font-bold text-gray-900 mb-1">{item.value}개</p>
          <p className="text-sm text-gray-500">{item.label}</p>
        </div>
      ))}
    </div>
  );
}
