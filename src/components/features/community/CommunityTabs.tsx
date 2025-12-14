'use client';

import { CommunityCategory } from '@/types';
import { communityTabs } from '@/constants';

interface CommunityTabsProps {
  activeTab: CommunityCategory;
  onTabChange: (tab: CommunityCategory) => void;
}

export function CommunityTabs({ activeTab, onTabChange }: CommunityTabsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {communityTabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`px-4 py-2 rounded-xl font-medium text-sm whitespace-nowrap transition-all ${
            activeTab === tab.id
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
              : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
