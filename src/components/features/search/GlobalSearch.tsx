"use client";

/**
 * GlobalSearch 컴포넌트
 *
 * 글로벌 검색 기능을 제공하는 통합 검색 컴포넌트입니다.
 *
 * 기능:
 * - 실시간 검색 결과 드롭다운 (debounce 300ms)
 * - 전체 종목 검색 (API 기반, ~5,000+ 종목)
 * - 뉴스/캘린더/용어사전 검색 (목업 데이터)
 * - 최근 검색어 표시 및 관리
 * - 키보드 지원: Enter, ESC, 화살표 위/아래
 * - 엔터 키 또는 검색 버튼 클릭 시 /search 페이지로 이동
 *
 * 최근 검색어:
 * - 검색 시 자동 저장 (localStorage)
 * - 검색창 포커스 시 드롭다운으로 표시
 * - 개별 삭제 (X 버튼) 및 전체 삭제
 * - 최대 10개 저장
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useRecentSearches, useStockSearch, type StockSearchResult } from "@/hooks";

// 드롭다운에 표시할 검색 결과 개수 제한
const DROPDOWN_LIMITS = {
  stocks: 5,  // 종목: 최대 5개
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

  // 검색어 상태
  const [query, setQuery] = useState("");

  // 드롭다운 열림 상태
  const [isOpen, setIsOpen] = useState(false);

  // 키보드 네비게이션을 위한 선택 인덱스
  const [selectedIndex, setSelectedIndex] = useState(-1);

  // 최근 검색어 표시 여부 (검색어가 비어있고 포커스된 경우)
  const [showRecentSearches, setShowRecentSearches] = useState(false);

  // 최근 검색어 훅
  const { recentSearches, isMounted, addSearch, removeSearch, clearAll } = useRecentSearches();

  // 종목 검색 훅 (API 기반)
  const { results: stockResults, isLoading, search: searchStocks, clear: clearStockResults } = useStockSearch();

  // 표시할 종목 결과 (제한된 개수)
  const limitedStockResults = stockResults.slice(0, DROPDOWN_LIMITS.stocks);

  /**
   * 검색어 변경 핸들러
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    if (value.trim()) {
      // 종목 검색 API 호출
      searchStocks(value, { limit: DROPDOWN_LIMITS.stocks });
      setShowRecentSearches(false);
      setIsOpen(true);
    } else {
      // 검색어 비어있으면 결과 초기화
      clearStockResults();
      if (recentSearches.length > 0 && isMounted) {
        setShowRecentSearches(true);
        setIsOpen(true);
      } else {
        setIsOpen(false);
      }
    }
  };

  /**
   * 검색 실행 및 페이지 이동
   * Enter 키 또는 검색 버튼 클릭 시 호출
   */
  const handleSubmitSearch = useCallback(() => {
    if (query.trim()) {
      // 최근 검색어에 추가
      addSearch(query.trim());
      // 검색 결과 페이지로 이동
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      closeDropdown();
    }
  }, [query, addSearch, router]);

  /**
   * 키보드 이벤트 핸들러
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // 최근 검색어 모드일 때의 키보드 네비게이션
    if (showRecentSearches && recentSearches.length > 0) {
      switch (e.key) {
        case "Enter":
          e.preventDefault();
          if (selectedIndex >= 0 && selectedIndex < recentSearches.length) {
            // 선택된 최근 검색어로 검색
            const selectedQuery = recentSearches[selectedIndex];
            setQuery(selectedQuery);
            addSearch(selectedQuery);
            router.push(`/search?q=${encodeURIComponent(selectedQuery)}`);
            closeDropdown();
          } else if (query.trim()) {
            handleSubmitSearch();
          }
          break;

        case "Escape":
          closeDropdown();
          inputRef.current?.blur();
          break;

        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < recentSearches.length - 1 ? prev + 1 : 0
          );
          break;

        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : recentSearches.length - 1
          );
          break;
      }
      return;
    }

    // 검색 결과 모드일 때의 키보드 네비게이션
    switch (e.key) {
      // Enter: 검색 결과 페이지로 이동 또는 선택된 아이템으로 이동
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && limitedStockResults[selectedIndex]) {
          navigateToResult(limitedStockResults[selectedIndex]);
        } else if (query.trim()) {
          handleSubmitSearch();
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
        if (limitedStockResults.length > 0) {
          setSelectedIndex((prev) =>
            prev < limitedStockResults.length - 1 ? prev + 1 : 0
          );
        }
        break;

      // 화살표 위: 이전 항목 선택
      case "ArrowUp":
        e.preventDefault();
        if (limitedStockResults.length > 0) {
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : limitedStockResults.length - 1
          );
        }
        break;
    }
  };

  /**
   * 검색 결과 아이템으로 이동
   * 각 타입에 따라 적절한 URL로 이동
   */
  const navigateToResult = (result: StockSearchResult) => {
    let url = "";

    if (result.type === 'kr') {
      // 한국 종목: /market/종목코드
      url = `/market/${result.symbol}`;
    } else {
      // 미국 종목: /market/티커
      url = `/market/${result.symbol}`;
    }

    if (url) {
      // 검색어가 있으면 최근 검색어에 추가
      if (query.trim()) {
        addSearch(query.trim());
      }
      router.push(url);
      closeDropdown();
    }
  };

  /**
   * 드롭다운 닫기
   */
  const closeDropdown = () => {
    setIsOpen(false);
    setShowRecentSearches(false);
    setSelectedIndex(-1);
    onClose?.();
  };

  /**
   * 포커스 핸들러
   * 검색어가 있으면 검색 결과 표시, 없으면 최근 검색어 표시
   */
  const handleFocus = () => {
    if (query.trim() && stockResults.length > 0) {
      // 검색어가 있으면 검색 결과 표시
      setIsOpen(true);
      setShowRecentSearches(false);
    } else if (!query.trim() && recentSearches.length > 0 && isMounted) {
      // 검색어가 없고 최근 검색어가 있으면 최근 검색어 표시
      setShowRecentSearches(true);
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
      setShowRecentSearches(false);
      setSelectedIndex(-1);
      onFocusChange?.(false);
    }, 150);
  };

  /**
   * 컴포넌트 언마운트 시 정리
   */
  useEffect(() => {
    return () => {
      clearStockResults();
    };
  }, [clearStockResults]);

  /**
   * 최근 검색어 클릭 핸들러
   */
  const handleRecentSearchClick = (searchQuery: string) => {
    setQuery(searchQuery);
    addSearch(searchQuery);
    router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
    closeDropdown();
  };

  /**
   * 최근 검색어 삭제 핸들러
   * 이벤트 버블링 방지
   */
  const handleRemoveRecentSearch = (e: React.MouseEvent, searchQuery: string) => {
    e.preventDefault();
    e.stopPropagation();
    removeSearch(searchQuery);
  };

  /**
   * 종목 결과 클릭 핸들러
   */
  const handleStockClick = (result: StockSearchResult) => {
    if (query.trim()) addSearch(query.trim());
    closeDropdown();
  };

  /**
   * 시장/거래소 라벨 반환
   */
  const getMarketLabel = (result: StockSearchResult): string => {
    if (result.type === 'kr') {
      return result.market;
    }
    return result.exchange;
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
          placeholder="종목명, 티커를 검색하세요"
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
              clearStockResults();
              // 최근 검색어가 있으면 최근 검색어 드롭다운 표시
              if (recentSearches.length > 0 && isMounted) {
                setShowRecentSearches(true);
                setIsOpen(true);
              } else {
                setIsOpen(false);
              }
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

      {/* 드롭다운 컨테이너 */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden z-50 max-h-[70vh] overflow-y-auto animate-fade-in"
        >
          {/* 최근 검색어 드롭다운 */}
          {showRecentSearches && recentSearches.length > 0 && (
            <>
              {/* 헤더: 최근 검색어 + 전체 삭제 */}
              <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  최근 검색어
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    clearAll();
                    setShowRecentSearches(false);
                    setIsOpen(false);
                  }}
                  className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  전체 삭제
                </button>
              </div>

              {/* 최근 검색어 목록 */}
              <div className="py-1">
                {recentSearches.map((searchQuery, idx) => (
                  <button
                    key={`recent-${searchQuery}-${idx}`}
                    type="button"
                    onClick={() => handleRecentSearchClick(searchQuery)}
                    className={`
                      w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left
                      ${selectedIndex === idx ? "bg-blue-50 dark:bg-blue-900/30" : ""}
                    `}
                  >
                    {/* 시계 아이콘 + 검색어 */}
                    <div className="flex items-center gap-2 min-w-0">
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
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                        {searchQuery}
                      </span>
                    </div>

                    {/* 삭제 버튼 */}
                    <button
                      type="button"
                      onClick={(e) => handleRemoveRecentSearch(e, searchQuery)}
                      className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0"
                      title="삭제"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* 검색 결과 드롭다운 */}
          {!showRecentSearches && query.trim() && (
            <>
              {/* 로딩 중 */}
              {isLoading && (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                  검색 중...
                </div>
              )}

              {/* 결과가 없는 경우 */}
              {!isLoading && limitedStockResults.length === 0 && (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                  &quot;{query}&quot;에 대한 검색 결과가 없습니다
                </div>
              )}

              {/* 종목 결과 */}
              {!isLoading && limitedStockResults.length > 0 && (
                <div>
                  <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800/50">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      📈 종목
                    </span>
                  </div>
                  {limitedStockResults.map((result, idx) => (
                    <Link
                      key={`stock-${result.symbol}-${idx}`}
                      href={`/market/${result.symbol}`}
                      onClick={() => handleStockClick(result)}
                      className={`
                        flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors
                        ${selectedIndex === idx ? "bg-blue-50 dark:bg-blue-900/30" : ""}
                      `}
                    >
                      {/* 종목 아이콘 */}
                      <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-300">
                        {result.symbol.slice(0, 2)}
                      </div>

                      {/* 종목 정보 */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {result.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {result.symbol} · {getMarketLabel(result)}
                        </p>
                      </div>
                    </Link>
                  ))}

                  {/* 더보기 버튼 */}
                  {stockResults.length > DROPDOWN_LIMITS.stocks && (
                    <Link
                      href={`/search?q=${encodeURIComponent(query)}`}
                      onClick={() => {
                        if (query.trim()) addSearch(query.trim());
                        closeDropdown();
                      }}
                      className="block px-3 py-3 text-center text-sm text-blue-600 dark:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800 border-t border-gray-100 dark:border-gray-800 transition-colors"
                    >
                      전체 결과 보기 →
                    </Link>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
