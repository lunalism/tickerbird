"use client";

import { useState } from "react";
import { newsData } from '@/constants';
import { Sidebar, BottomNav } from '@/components/layout';
import { CategoryTabs } from '@/components/ui';
import { NewsCard } from '@/components/features/news';
import { MobileSearchHeader, GlobalSearch } from '@/components/features/search';

export default function Home() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeMenu, setActiveMenu] = useState("news");

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

          {/* News Feed Grid */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-3 lg:gap-5 2xl:grid-cols-4 2xl:gap-6">
            {newsData.map((news) => (
              <NewsCard key={news.id} news={news} />
            ))}
          </div>

          {/* Load More */}
          <div className="mt-8 text-center">
            <button className="px-6 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              더 보기
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
