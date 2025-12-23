"use client";

import { useState, useEffect } from "react";
import { newsData } from '@/constants';
import { Sidebar, BottomNav } from '@/components/layout';
import { CategoryTabs } from '@/components/ui';
import { NewsCard } from '@/components/features/news';
import { MobileSearchHeader, GlobalSearch } from '@/components/features/search';
import { NewsCardSkeletonGrid } from '@/components/skeleton';

export default function Home() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeMenu, setActiveMenu] = useState("news");

  // ========== 로딩 상태 관리 ==========
  // isLoading: 데이터 로딩 중 여부
  const [isLoading, setIsLoading] = useState(true);

  /**
   * 데이터 로딩 시뮬레이션
   *
   * 실제 API 호출 시에는 이 부분을 fetch/axios로 대체합니다.
   * 테스트용으로 2초 딜레이를 추가했습니다.
   *
   * TODO: 실제 API 연동 시 아래 코드를 수정하세요
   * - setIsLoading(true) 후 API 호출
   * - 응답 받으면 setIsLoading(false)
   */
  useEffect(() => {
    // 테스트용 2초 딜레이 (실제 배포 시 제거)
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

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
          {/* 카테고리 탭 + 검색바 영역 */}
          <div className="mb-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Category Tabs */}
            <div className="flex-1 min-w-0">
              <CategoryTabs activeCategory={activeCategory} onCategoryChange={setActiveCategory} />
            </div>

            {/* 데스크톱 검색바 (lg 이상에서만 표시) */}
            <div className="hidden lg:block w-72 flex-shrink-0">
              <GlobalSearch compact />
            </div>
          </div>

          {/* News Feed Grid - 로딩 중이면 스켈레톤, 완료되면 실제 데이터 */}
          {isLoading ? (
            // 로딩 스켈레톤 (8개의 뉴스 카드 플레이스홀더)
            <NewsCardSkeletonGrid count={8} />
          ) : (
            // 실제 뉴스 데이터
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-3 lg:gap-5 2xl:grid-cols-4 2xl:gap-6">
              {newsData.map((news) => (
                <NewsCard key={news.id} news={news} />
              ))}
            </div>
          )}

          {/* Load More - 로딩 완료 후에만 표시 */}
          {!isLoading && (
            <div className="mt-8 text-center">
              <button className="px-6 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                더 보기
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
