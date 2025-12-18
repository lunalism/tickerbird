"use client";

/**
 * GlobalSearch 컴포넌트
 * - 데스크톱: 사이드바에 통합
 * - 실시간 검색 결과 드롭다운 (debounce 300ms)
 * - 키보드 지원: Enter, ESC, 화살표 위/아래
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { search, limitSearchResults } from "@/utils/search";
import type { GroupedSearchResults, SearchResults } from "@/types";

// 드롭다운에 표시할 결과 개수 제한
const DROPDOWN_LIMITS = {
  stocks: 5,
  news: 3,
  calendar: 3,
  glossary: 3,
};

interface GlobalSearchProps {
  /** 컴팩트 모드 (사이드바용) */
  compact?: boolean;
  /** 검색창 닫기 콜백 (모바일용) */
  onClose?: () => void;
  /** 포커스 상태 콜백 */
  onFocusChange?: (focused: boolean) => void;
}

export function GlobalSearch({
  compact = false,
  onClose,
  onFocusChange,
}: GlobalSearchProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GroupedSearchResults | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);

  // debounce 타이머 ref
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // 결과 아이템들을 플랫하게 변환 (키보드 네비게이션용)
  const flattenedResults = results
    ? [
        ...results.stocks,
        ...results.news,
        ...results.calendar,
        ...results.glossary,
      ]
    : [];

  /**
   * 검색 실행 (debounced)
   */
  const performSearch = useCallback((searchQuery: string) => {
    // 이전 타이머 취소
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!searchQuery.trim()) {
      setResults(null);
      setIsOpen(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    // 300ms debounce
    debounceRef.current = setTimeout(() => {
      const searchResults = search(searchQuery);
      const limitedResults = limitSearchResults(
        searchResults.results,
        DROPDOWN_LIMITS
      );
      setResults(limitedResults);
      setIsOpen(true);
      setSelectedIndex(-1);
      setIsLoading(false);
    }, 300);
  }, []);

  /**
   * 검색어 변경 핸들러
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    performSearch(value);
  };

  /**
   * 키보드 이벤트 핸들러
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      // Enter: 검색 결과 페이지로 이동 또는 선택된 아이템으로 이동
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && flattenedResults[selectedIndex]) {
          navigateToResult(flattenedResults[selectedIndex]);
        } else if (query.trim()) {
          // 검색 결과 페이지로 이동
          router.push(`/search?q=${encodeURIComponent(query.trim())}`);
          closeDropdown();
        }
        break;

      // ESC: 드롭다운 닫기
      case "Escape":
        closeDropdown();
        inputRef.current?.blur();
        break;

      // 화살표 아래: 다음 항목 선택
      case "ArrowDown":
        e.preventDefault();
        if (flattenedResults.length > 0) {
          setSelectedIndex((prev) =>
            prev < flattenedResults.length - 1 ? prev + 1 : 0
          );
        }
        break;

      // 화살표 위: 이전 항목 선택
      case "ArrowUp":
        e.preventDefault();
        if (flattenedResults.length > 0) {
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : flattenedResults.length - 1
          );
        }
        break;
    }
  };

  /**
   * 검색 결과 아이템으로 이동
   */
  const navigateToResult = (result: (typeof flattenedResults)[0]) => {
    let url = "";

    switch (result.type) {
      case "stock":
        url = `/market/${result.item.ticker}`;
        break;
      case "news":
        url = `/news/${result.item.id}`;
        break;
      case "calendar":
        url = `/calendar`;
        break;
      case "glossary":
        url = `/glossary?term=${result.item.id}`;
        break;
    }

    if (url) {
      router.push(url);
      closeDropdown();
    }
  };

  /**
   * 드롭다운 닫기
   */
  const closeDropdown = () => {
    setIsOpen(false);
    setSelectedIndex(-1);
    onClose?.();
  };

  /**
   * 포커스 핸들러
   */
  const handleFocus = () => {
    if (query.trim() && results) {
      setIsOpen(true);
    }
    onFocusChange?.(true);
  };

  /**
   * 블러 핸들러 (외부 클릭 감지)
   */
  const handleBlur = (e: React.FocusEvent) => {
    // 드롭다운 내부 클릭은 무시
    if (dropdownRef.current?.contains(e.relatedTarget as Node)) {
      return;
    }
    // 약간의 딜레이 후 닫기 (클릭 이벤트 처리 후)
    setTimeout(() => {
      setIsOpen(false);
      setSelectedIndex(-1);
      onFocusChange?.(false);
    }, 150);
  };

  /**
   * 검색 결과 총 개수 계산
   */
  const getTotalCount = () => {
    if (!results) return 0;
    const fullResults = search(query);
    return fullResults.totalCount;
  };

  /**
   * 컴포넌트 언마운트 시 타이머 정리
   */
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // 현재 선택된 항목의 인덱스 (각 카테고리별)
  const getItemIndex = (categoryResults: unknown[], itemIndex: number) => {
    let offset = 0;
    if (results) {
      if (categoryResults === results.news) {
        offset = results.stocks.length;
      } else if (categoryResults === results.calendar) {
        offset = results.stocks.length + results.news.length;
      } else if (categoryResults === results.glossary) {
        offset =
          results.stocks.length + results.news.length + results.calendar.length;
      }
    }
    return offset + itemIndex;
  };

  return (
    <div className="relative w-full">
      {/* 검색 입력창 */}
      <div className="relative">
        {/* 검색 아이콘 */}
        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <svg
            className="w-4 h-4 text-gray-400"
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
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder="뉴스, 종목, 용어를 검색하세요"
          className={`
            w-full bg-gray-100 dark:bg-gray-800
            border border-transparent
            focus:border-blue-500 focus:bg-white dark:focus:bg-gray-900
            rounded-xl
            text-sm text-gray-900 dark:text-white
            placeholder-gray-500 dark:placeholder-gray-400
            transition-all duration-200
            outline-none
            ${compact ? "pl-9 pr-3 py-2" : "pl-10 pr-4 py-2.5"}
          `}
        />

        {/* 로딩 인디케이터 */}
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-gray-300 dark:border-gray-600 border-t-blue-500 rounded-full animate-spin" />
          </div>
        )}

        {/* 검색어 지우기 버튼 */}
        {query && !isLoading && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setResults(null);
              setIsOpen(false);
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* 검색 결과 드롭다운 */}
      {isOpen && results && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden z-50 max-h-[70vh] overflow-y-auto animate-fade-in"
        >
          {/* 결과가 없는 경우 */}
          {flattenedResults.length === 0 ? (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
              &quot;{query}&quot;에 대한 검색 결과가 없습니다
            </div>
          ) : (
            <>
              {/* 종목 결과 */}
              {results.stocks.length > 0 && (
                <div className="border-b border-gray-100 dark:border-gray-800">
                  <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800/50">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      📈 종목
                    </span>
                  </div>
                  {results.stocks.map((result, idx) => {
                    const globalIdx = getItemIndex(results.stocks, idx);
                    return (
                      <Link
                        key={`stock-${result.item.ticker}`}
                        href={`/market/${result.item.ticker}`}
                        onClick={closeDropdown}
                        className={`
                          flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors
                          ${selectedIndex === globalIdx ? "bg-blue-50 dark:bg-blue-900/30" : ""}
                        `}
                      >
                        <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-300">
                          {result.item.ticker.slice(0, 2)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {result.item.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {result.item.ticker}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {typeof result.item.price === 'number'
                              ? result.item.price.toLocaleString()
                              : result.item.price}
                          </p>
                          <p
                            className={`text-xs ${
                              result.item.changePercent >= 0
                                ? "text-red-500"
                                : "text-blue-500"
                            }`}
                          >
                            {result.item.changePercent >= 0 ? "+" : ""}
                            {result.item.changePercent.toFixed(2)}%
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}

              {/* 뉴스 결과 */}
              {results.news.length > 0 && (
                <div className="border-b border-gray-100 dark:border-gray-800">
                  <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800/50">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      📰 뉴스
                    </span>
                  </div>
                  {results.news.map((result, idx) => {
                    const globalIdx = getItemIndex(results.news, idx);
                    return (
                      <Link
                        key={`news-${result.item.id}`}
                        href={`/news/${result.item.id}`}
                        onClick={closeDropdown}
                        className={`
                          block px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors
                          ${selectedIndex === globalIdx ? "bg-blue-50 dark:bg-blue-900/30" : ""}
                        `}
                      >
                        <p className="text-sm text-gray-900 dark:text-white line-clamp-1">
                          {result.item.title}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {result.item.source} · {result.item.time}
                        </p>
                      </Link>
                    );
                  })}
                </div>
              )}

              {/* 캘린더 결과 */}
              {results.calendar.length > 0 && (
                <div className="border-b border-gray-100 dark:border-gray-800">
                  <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800/50">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      📅 캘린더
                    </span>
                  </div>
                  {results.calendar.map((result, idx) => {
                    const globalIdx = getItemIndex(results.calendar, idx);
                    return (
                      <Link
                        key={`calendar-${result.item.id}`}
                        href="/calendar"
                        onClick={closeDropdown}
                        className={`
                          block px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors
                          ${selectedIndex === globalIdx ? "bg-blue-50 dark:bg-blue-900/30" : ""}
                        `}
                      >
                        <p className="text-sm text-gray-900 dark:text-white line-clamp-1">
                          {result.item.title}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {result.item.date}
                          {result.item.time && ` · ${result.item.time}`}
                        </p>
                      </Link>
                    );
                  })}
                </div>
              )}

              {/* 용어사전 결과 */}
              {results.glossary.length > 0 && (
                <div>
                  <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800/50">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      📖 용어사전
                    </span>
                  </div>
                  {results.glossary.map((result, idx) => {
                    const globalIdx = getItemIndex(results.glossary, idx);
                    return (
                      <Link
                        key={`glossary-${result.item.id}`}
                        href={`/glossary?term=${result.item.id}`}
                        onClick={closeDropdown}
                        className={`
                          block px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors
                          ${selectedIndex === globalIdx ? "bg-blue-50 dark:bg-blue-900/30" : ""}
                        `}
                      >
                        <p className="text-sm text-gray-900 dark:text-white">
                          <span className="font-medium">{result.item.abbreviation}</span>
                          <span className="text-gray-500 dark:text-gray-400 ml-2">
                            {result.item.korean}
                          </span>
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                          {result.item.description}
                        </p>
                      </Link>
                    );
                  })}
                </div>
              )}

              {/* 더보기 버튼 */}
              {getTotalCount() > flattenedResults.length && (
                <Link
                  href={`/search?q=${encodeURIComponent(query)}`}
                  onClick={closeDropdown}
                  className="block px-3 py-3 text-center text-sm text-blue-600 dark:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800 border-t border-gray-100 dark:border-gray-800 transition-colors"
                >
                  전체 {getTotalCount()}개 결과 보기 →
                </Link>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
