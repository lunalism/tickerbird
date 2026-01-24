"use client";

/**
 * MobileSearchHeader 컴포넌트
 *
 * 모바일 상단 헤더입니다.
 *
 * 기능:
 * - 로고 클릭 시 홈으로 이동
 * - 검색 아이콘 클릭 시 /search 페이지로 이동
 * - 다크모드 지원
 */

import Link from "next/link";
import { useRouter } from "next/navigation";

interface MobileSearchHeaderProps {
  /** 현재 페이지 타이틀 */
  title?: string;
}

export function MobileSearchHeader({ title = "AlphaBoard" }: MobileSearchHeaderProps) {
  const router = useRouter();

  /**
   * 검색 페이지로 이동
   */
  const handleSearchClick = () => {
    router.push("/search");
  };

  return (
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

        {/* 검색 버튼 - 클릭 시 /search 페이지로 이동 */}
        <button
          type="button"
          onClick={handleSearchClick}
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
  );
}
