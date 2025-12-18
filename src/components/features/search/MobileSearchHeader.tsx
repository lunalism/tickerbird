"use client";

/**
 * MobileSearchHeader 컴포넌트
 * - 모바일 상단 헤더
 * - 검색 아이콘 클릭 시 검색바 펼침
 * - 다크모드 지원
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { GlobalSearch } from "./GlobalSearch";

interface MobileSearchHeaderProps {
  /** 현재 페이지 타이틀 */
  title?: string;
}

export function MobileSearchHeader({ title = "AlphaBoard" }: MobileSearchHeaderProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

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

            {/* 검색 안내 (검색어 입력 전) */}
            <div className="p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                뉴스, 종목, 용어를 검색하세요
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-lg">
                  삼성전자
                </span>
                <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-lg">
                  NVIDIA
                </span>
                <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-lg">
                  CPI
                </span>
                <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-lg">
                  FOMC
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
