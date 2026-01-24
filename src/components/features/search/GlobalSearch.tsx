"use client";

/**
 * GlobalSearch 컴포넌트
 *
 * 검색 페이지(/search)로 이동하는 검색 버튼/입력창입니다.
 *
 * 동작:
 * - 클릭 시 /search 페이지로 이동
 * - 드롭다운 없음 (모든 검색 기능은 /search 페이지에서 처리)
 *
 * 사용처:
 * - 데스크톱 사이드바 (lg 이상)
 * - 각 페이지 헤더
 */

import { useRouter } from "next/navigation";

interface GlobalSearchProps {
  /** 컴팩트 모드 (작은 크기) */
  compact?: boolean;
}

export function GlobalSearch({ compact = false }: GlobalSearchProps) {
  const router = useRouter();

  /**
   * 검색 페이지로 이동
   */
  const handleClick = () => {
    router.push("/search");
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`
        w-full bg-gray-100 dark:bg-gray-800
        border border-transparent
        hover:border-gray-300 dark:hover:border-gray-600
        hover:bg-gray-50 dark:hover:bg-gray-700
        rounded-xl
        text-sm text-gray-500 dark:text-gray-400
        transition-all duration-200
        flex items-center gap-2
        ${compact ? "px-3 py-2" : "px-4 py-2.5"}
      `}
    >
      {/* 검색 아이콘 */}
      <svg
        className="w-4 h-4 text-gray-400 flex-shrink-0"
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
      {/* 플레이스홀더 텍스트 */}
      <span className="truncate">종목명, 티커를 검색하세요</span>
    </button>
  );
}
