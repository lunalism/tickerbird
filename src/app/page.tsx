"use client";

import { useState } from "react";
import { Sidebar, BottomNav } from '@/components/layout';
import { CrawledNewsCard } from '@/components/features/news';
import { MobileSearchHeader, GlobalSearch } from '@/components/features/search';
import { NewsCardSkeletonGrid } from '@/components/skeleton';
import { useNews } from '@/hooks';
import { NEWS_CATEGORIES, type CrawledNewsCategory } from '@/types/crawled-news';

export default function Home() {
  const [activeCategory, setActiveCategory] = useState<CrawledNewsCategory>("headlines");
  const [activeMenu, setActiveMenu] = useState("news");

  // 뉴스 데이터 페칭 (5분마다 자동 리페치)
  const { news, isLoading, error, isCached, refetch } = useNews({
    category: activeCategory,
    limit: 20,
    refetchInterval: 5 * 60 * 1000, // 5분
  });

  return (
    <div className="min-h-screen bg-[#f8f9fa] dark:bg-gray-900">
      {/* 모바일 헤더 (검색 포함) */}
      <MobileSearchHeader title="뉴스" />

      {/* Sidebar - hidden on mobile */}
      <Sidebar activeMenu={activeMenu} onMenuChange={setActiveMenu} />

      {/* Bottom Navigation - visible only on mobile */}
      <BottomNav activeMenu={activeMenu} onMenuChange={setActiveMenu} />

      {/* Main Content */}
      <main className="md:pl-[72px] lg:pl-60 transition-all duration-300 pt-14 md:pt-0">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-6">
          {/* 뉴스 카테고리 탭 + 검색바 영역 */}
          <div className="mb-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* News Category Tabs */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1 overflow-x-auto pb-2 scrollbar-hide">
                {NEWS_CATEGORIES.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setActiveCategory(category.id)}
                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                      activeCategory === category.id
                        ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
                        : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700"
                    }`}
                  >
                    <span>{category.emoji}</span>
                    {category.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 데스크톱 검색바 (lg 이상에서만 표시) */}
            <div className="hidden lg:flex items-center gap-2 flex-shrink-0">
              {/* 캐시 상태 표시 */}
              {isCached && !isLoading && (
                <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  캐시됨
                </span>
              )}
              {/* 새로고침 버튼 */}
              <button
                onClick={() => refetch()}
                disabled={isLoading}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50 transition-colors"
                title="새로고침"
              >
                <svg className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              <div className="w-72">
                <GlobalSearch compact />
              </div>
            </div>
          </div>

          {/* 에러 표시 */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium">{error}</span>
              </div>
              <button
                onClick={() => refetch()}
                className="mt-2 text-sm text-red-600 dark:text-red-400 hover:underline"
              >
                다시 시도
              </button>
            </div>
          )}

          {/* News Feed Grid - 로딩 중이면 스켈레톤, 완료되면 실제 데이터 */}
          {isLoading ? (
            // 로딩 스켈레톤 (8개의 뉴스 카드 플레이스홀더)
            <NewsCardSkeletonGrid count={8} />
          ) : news.length === 0 ? (
            // 뉴스가 없는 경우
            <div className="text-center py-12">
              <span className="text-4xl mb-4 block">📰</span>
              <p className="text-gray-500 dark:text-gray-400">
                뉴스를 불러오지 못했습니다.
              </p>
            </div>
          ) : (
            // 크롤링된 뉴스 데이터
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-3 lg:gap-5 2xl:grid-cols-4 2xl:gap-6">
              {news.map((item) => (
                <CrawledNewsCard key={item.id} news={item} />
              ))}
            </div>
          )}

          {/* Load More - 로딩 완료 후에만 표시 */}
          {!isLoading && news.length > 0 && (
            <div className="mt-8 text-center">
              <button
                onClick={() => refetch()}
                className="px-6 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                새로고침
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
