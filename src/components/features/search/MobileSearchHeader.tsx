"use client";

/**
 * MobileSearchHeader 컴포넌트
 *
 * 모바일 상단 헤더 + 전체 화면 검색 모달
 *
 * 기능:
 * - 검색 아이콘 클릭 시 전체 화면 검색 오버레이 표시
 * - 최근 본 종목 표시 (수평 스크롤 카드)
 * - 인기 검색어 표시
 * - ESC 키로 닫기
 * - 다크모드 지원
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { GlobalSearch } from "./GlobalSearch";
import { useRecentlyViewed, usePopularSearches } from "@/hooks";

interface MobileSearchHeaderProps {
  /** 현재 페이지 타이틀 */
  title?: string;
}

export function MobileSearchHeader({ title = "AlphaBoard" }: MobileSearchHeaderProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // 최근 본 종목 훅
  const { recentlyViewed, isLoaded: isRecentlyViewedLoaded } = useRecentlyViewed();

  // 인기 검색어 훅 (Firestore 기반)
  const { popularSearches, isLoading: isPopularLoading } = usePopularSearches();

  // ESC 키로 검색창 닫기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isSearchOpen) {
        setIsSearchOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isSearchOpen]);

  // 검색창 열릴 때 스크롤 방지
  useEffect(() => {
    if (isSearchOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isSearchOpen]);

  return (
    <>
      {/* 모바일 헤더 (md 미만에서만 표시) */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 z-40 md:hidden">
        <div className="flex items-center justify-between h-full px-4">
          {/* 로고 */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <span className="font-semibold text-gray-900 dark:text-white">
              {title}
            </span>
          </Link>

          {/* 검색 버튼 */}
          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="검색"
          >
            <svg
              className="w-5 h-5 text-gray-600 dark:text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </button>
        </div>
      </header>

      {/* 검색 오버레이 */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 md:hidden animate-fade-in">
          {/* 배경 오버레이 */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsSearchOpen(false)}
          />

          {/* 검색 패널 */}
          <div className="absolute top-0 left-0 right-0 bg-white dark:bg-gray-900 shadow-xl">
            {/* 헤더 */}
            <div className="flex items-center gap-3 p-4 border-b border-gray-100 dark:border-gray-800">
              {/* 뒤로 가기 버튼 */}
              <button
                type="button"
                onClick={() => setIsSearchOpen(false)}
                className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="닫기"
              >
                <svg
                  className="w-5 h-5 text-gray-600 dark:text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>

              {/* 검색 입력창 */}
              <div className="flex-1">
                <GlobalSearch
                  compact
                  onClose={() => setIsSearchOpen(false)}
                />
              </div>
            </div>

            {/* ========================================
                검색 안내 영역 (검색어 입력 전)
                - 최근 본 종목 (수평 스크롤)
                - 인기 검색어
                ======================================== */}
            <div className="p-4 space-y-6">
              {/* 최근 본 종목 섹션 */}
              {isRecentlyViewedLoaded && recentlyViewed.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-base">👀</span>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      최근 본 종목
                    </h3>
                  </div>
                  {/* 수평 스크롤 카드 */}
                  <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
                    {recentlyViewed.slice(0, 10).map((stock) => (
                      <Link
                        key={`mobile-recent-${stock.ticker}`}
                        href={`/market/${stock.ticker}?market=${stock.market}`}
                        onClick={() => setIsSearchOpen(false)}
                        className="flex-shrink-0 px-3 py-2 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors min-w-[100px]"
                      >
                        {/* 시장 배지 */}
                        <span className={`inline-block px-1.5 py-0.5 text-[10px] font-medium rounded mb-1 ${
                          stock.market === 'kr'
                            ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                            : 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                        }`}>
                          {stock.market === 'kr' ? 'KR' : 'US'}
                        </span>
                        {/* 종목명 */}
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {stock.name}
                        </p>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {/* ========================================
                  인기 검색어 섹션
                  - Firestore에서 실시간 집계된 인기 검색어 표시
                  - 최근 7일간 가장 많이 검색된 검색어
                  ======================================== */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-base">🔥</span>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    인기 검색어
                  </h3>
                </div>
                {/* 로딩 상태 */}
                {isPopularLoading ? (
                  <div className="flex gap-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="h-7 w-16 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {popularSearches.map((item) => (
                      <Link
                        key={`popular-${item.query}`}
                        href={`/search?q=${encodeURIComponent(item.query)}`}
                        onClick={() => setIsSearchOpen(false)}
                        className="text-xs px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                      >
                        {item.query}
                      </Link>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
