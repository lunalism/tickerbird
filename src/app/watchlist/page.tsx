'use client';

import { useState } from 'react';
import { MarketRegion } from '@/types';
import { Sidebar, BottomNav } from '@/components/layout';
import { MarketTabs } from '@/components/features/market';
import { LoginPrompt, WatchlistTable } from '@/components/features/watchlist';
import { watchlistData } from '@/constants';
import { useAuthStore } from '@/stores';

export default function WatchlistPage() {
  const [activeMenu, setActiveMenu] = useState('watchlist');
  const [activeMarket, setActiveMarket] = useState<MarketRegion>('us');
  const { isLoggedIn, login } = useAuthStore();
  const [items, setItems] = useState(watchlistData);

  const handleDelete = (id: string) => {
    setItems(prev => ({
      ...prev,
      [activeMarket]: prev[activeMarket].filter(item => item.id !== id),
    }));
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      {/* Sidebar - hidden on mobile */}
      <Sidebar activeMenu={activeMenu} onMenuChange={setActiveMenu} />

      {/* Bottom Navigation - visible only on mobile */}
      <BottomNav activeMenu={activeMenu} onMenuChange={setActiveMenu} />

      {/* Main Content */}
      <main className="md:pl-[72px] lg:pl-60 transition-all duration-300">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-6">
          {/* Page Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">관심종목</h1>
            <p className="text-gray-500 text-sm">나만의 관심종목을 관리하세요</p>
          </div>

          {!isLoggedIn ? (
            <LoginPrompt onLogin={login} />
          ) : (
            <>
              {/* Market Tabs & Add Button */}
              <div className="flex items-center justify-between mb-6">
                <MarketTabs activeMarket={activeMarket} onMarketChange={setActiveMarket} />
                <button className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  종목 추가
                </button>
              </div>

              {/* Watchlist Table */}
              <WatchlistTable
                items={items[activeMarket]}
                market={activeMarket}
                onDelete={handleDelete}
              />
            </>
          )}
        </div>
      </main>
    </div>
  );
}
