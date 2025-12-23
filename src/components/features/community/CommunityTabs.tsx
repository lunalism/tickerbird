'use client';

/**
 * CommunityTabs 컴포넌트
 *
 * 카테고리 탭과 정렬 옵션을 제공합니다.
 *
 * 탭: [전체] [팔로잉] [종목토론] [투자전략] [Q&A]
 * 정렬: 최신순 | 인기순
 */

import { CommunityCategory, SortType } from '@/types/community';
import { communityTabs } from '@/constants';

interface CommunityTabsProps {
  /** 현재 선택된 탭 */
  activeTab: CommunityCategory;
  /** 탭 변경 콜백 */
  onTabChange: (tab: CommunityCategory) => void;
  /** 현재 정렬 방식 */
  sortType?: SortType;
  /** 정렬 변경 콜백 */
  onSortChange?: (sort: SortType) => void;
}

export function CommunityTabs({
  activeTab,
  onTabChange,
  sortType = 'latest',
  onSortChange,
}: CommunityTabsProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      {/* 카테고리 탭 */}
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
        {communityTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`px-4 py-2 rounded-full font-medium text-sm whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 정렬 옵션 */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={() => onSortChange?.('latest')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            sortType === 'latest'
              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          최신순
        </button>
        <button
          onClick={() => onSortChange?.('popular')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            sortType === 'popular'
              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          인기순
        </button>
      </div>
    </div>
  );
}
