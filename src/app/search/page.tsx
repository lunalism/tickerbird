"use client";

/**
 * 검색 결과 페이지 (/search)
 *
 * URL 쿼리 파라미터를 통해 검색 결과를 표시합니다.
 *
 * 기능:
 * - URL: /search?q=검색어
 * - 검색 대상: 종목명, 티커, 뉴스 제목, 캘린더 이벤트, 용어사전
 * - 카테고리별 탭 필터: 전체 | 종목 | 뉴스 | 캘린더 | 용어사전
 * - 검색 결과 없을 때: "검색 결과가 없습니다" 표시
 * - 반응형 UI (데스크톱/모바일)
 * - 다크모드 지원
 *
 * 최근 검색어:
 * - 페이지 진입 시 검색어 자동 저장
 * - 검색창 포커스 시 최근 검색어 드롭다운 표시
 */

import { useState, useEffect, useCallback, Suspense, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Sidebar } from "@/components/layout";
import { MobileSearchHeader, GlobalSearch } from "@/components/features/search";
import { searchCategoryFilters } from "@/utils/search";
import { useRecentSearches, useStockSearch, usePopularSearches, type StockSearchResult } from "@/hooks";
import { newsData } from "@/constants/news";
import { glossaryTerms } from "@/constants/glossary";
import { calendarEvents } from "@/constants/calendar";
import type { SearchCategory, NewsItem, GlossaryTerm, CalendarEvent } from "@/types";

/**
 * 검색 입력 컴포넌트
 *
 * 검색창과 최근 검색어 드롭다운을 표시합니다.
 *
 * Props:
 * - value: 현재 검색어
 * - onChange: 검색어 변경 핸들러
 * - onSearch: 검색 실행 핸들러
 */
function SearchInput({
  value,
  onChange,
  onSearch,
  disableDropdown = false,
}: {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  /** 드롭다운 비활성화 (모바일에서 페이지 섹션과 중복 방지) */
  disableDropdown?: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 최근 검색어 훅
  const { recentSearches, isMounted, addSearch, removeSearch, clearAll } = useRecentSearches();

  // 드롭다운 열림 상태
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // 키보드 네비게이션을 위한 선택 인덱스
  const [selectedIndex, setSelectedIndex] = useState(-1);

  /**
   * 포커스 핸들러
   * 검색어가 비어있고 최근 검색어가 있으면 드롭다운 표시
   * disableDropdown이 true면 드롭다운 표시하지 않음
   */
  const handleFocus = () => {
    if (disableDropdown) return;
    if (!value.trim() && recentSearches.length > 0 && isMounted) {
      setIsDropdownOpen(true);
    }
  };

  /**
   * 블러 핸들러
   * 드롭다운 외부 클릭 시 닫기
   */
  const handleBlur = (e: React.FocusEvent) => {
    // 드롭다운 내부 클릭은 무시
    if (dropdownRef.current?.contains(e.relatedTarget as Node)) {
      return;
    }
    setTimeout(() => {
      setIsDropdownOpen(false);
      setSelectedIndex(-1);
    }, 150);
  };

  /**
   * 입력값 변경 핸들러
   * 값이 비어있으면 최근 검색어 드롭다운 표시
   * disableDropdown이 true면 드롭다운 표시하지 않음
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    if (disableDropdown) return;

    if (!newValue.trim() && recentSearches.length > 0 && isMounted) {
      setIsDropdownOpen(true);
    } else {
      setIsDropdownOpen(false);
    }
  };

  /**
   * 키보드 이벤트 핸들러
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // 최근 검색어 드롭다운이 열려있을 때
    if (isDropdownOpen && recentSearches.length > 0) {
      switch (e.key) {
        case "Enter":
          e.preventDefault();
          if (selectedIndex >= 0 && selectedIndex < recentSearches.length) {
            // 선택된 최근 검색어로 검색
            const selectedQuery = recentSearches[selectedIndex];
            onChange(selectedQuery);
            addSearch(selectedQuery);
            router.push(`/search?q=${encodeURIComponent(selectedQuery)}`);
            setIsDropdownOpen(false);
          } else {
            onSearch();
          }
          break;

        case "Escape":
          setIsDropdownOpen(false);
          setSelectedIndex(-1);
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

    // 일반 검색 모드
    if (e.key === "Enter") {
      onSearch();
    }
  };

  /**
   * 최근 검색어 클릭 핸들러
   */
  const handleRecentSearchClick = (query: string) => {
    onChange(query);
    addSearch(query);
    router.push(`/search?q=${encodeURIComponent(query)}`);
    setIsDropdownOpen(false);
  };

  /**
   * 최근 검색어 삭제 핸들러
   */
  const handleRemoveRecentSearch = (e: React.MouseEvent, query: string) => {
    e.preventDefault();
    e.stopPropagation();
    removeSearch(query);

    // 마지막 검색어 삭제 시 드롭다운 닫기
    if (recentSearches.length <= 1) {
      setIsDropdownOpen(false);
    }
  };

  return (
    <div className="relative">
        {/* 검색 아이콘 */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
          <svg
            className="w-5 h-5 text-gray-400"
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

        {/* 검색 입력창 */}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder="뉴스, 종목, 용어를 검색하세요"
          className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
          autoFocus
        />

      {/* 검색어 지우기 버튼 */}
      {value && (
        <button
          type="button"
          onClick={() => {
            onChange("");
            if (!disableDropdown && recentSearches.length > 0 && isMounted) {
              setIsDropdownOpen(true);
            }
            inputRef.current?.focus();
          }}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      {/* 최근 검색어 드롭다운 (disableDropdown일 때는 렌더링하지 않음) */}
      {!disableDropdown && isDropdownOpen && recentSearches.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden z-50"
        >
          {/* 헤더: 최근 검색어 + 전체 삭제 */}
          <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              최근 검색어
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                clearAll();
                setIsDropdownOpen(false);
              }}
              className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              전체 삭제
            </button>
          </div>

          {/* 최근 검색어 목록 */}
          <div className="py-1 max-h-[300px] overflow-y-auto">
            {recentSearches.map((query, idx) => (
              /**
               * 최근 검색어 항목
               *
               * 주의: HTML 규격상 button 안에 button을 넣을 수 없음 (Hydration Error 발생)
               * 따라서 외부 요소는 div로 하고, 클릭 영역과 삭제 버튼을 분리함
               *
               * 구조:
               * - div (컨테이너, 키보드 선택 시 배경색 변경)
               *   - div (클릭 가능한 검색어 영역 - onClick으로 검색 실행)
               *   - button (삭제 버튼 - stopPropagation으로 이벤트 버블링 방지)
               */
              <div
                key={`recent-${query}-${idx}`}
                className={`
                  w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors
                  ${selectedIndex === idx ? "bg-blue-50 dark:bg-blue-900/30" : ""}
                `}
              >
                {/* 클릭 가능한 검색어 영역 (시계 아이콘 + 검색어) */}
                <div
                  className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                  onClick={() => handleRecentSearchClick(query)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      handleRecentSearchClick(query);
                    }
                  }}
                >
                  {/* 시계 아이콘 - 최근 검색어임을 나타냄 */}
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
                  {/* 검색어 텍스트 */}
                  <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                    {query}
                  </span>
                </div>

                {/* 삭제 버튼 - 개별 검색어 삭제 */}
                <button
                  type="button"
                  onClick={(e) => handleRemoveRecentSearch(e, query)}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0"
                  title="삭제"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * 종목 검색 결과 카드 컴포넌트 (API 기반)
 *
 * 종목명, 티커, 시장/거래소 정보를 표시합니다.
 * 클릭 시 종목 상세 페이지로 이동합니다.
 *
 * URL 형식:
 * - 한국 종목: /market/005930?market=kr
 * - 미국 종목: /market/IREN?market=us
 *
 * market 파라미터를 통해 종목 상세 페이지에서 올바른 API를 호출할 수 있습니다.
 */
function StockResultCard({
  stock,
}: {
  stock: StockSearchResult;
}) {
  // 시장/거래소 표시 텍스트
  // - 한국 종목: KOSPI 또는 KOSDAQ
  // - 미국 종목: NASDAQ, NYSE, AMEX
  const marketLabel = stock.type === 'kr'
    ? stock.market // KOSPI or KOSDAQ
    : stock.exchange; // NASDAQ, NYSE, AMEX

  /**
   * 종목 상세 페이지 URL 생성
   *
   * market 쿼리 파라미터를 추가하여 종목 상세 페이지에서
   * 한국/미국 종목을 구분하고 적절한 API를 호출할 수 있도록 합니다.
   */
  const detailUrl = `/market/${stock.symbol}?market=${stock.type}`;

  return (
    <Link
      href={detailUrl}
      className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
    >
      {/* 종목 아이콘 */}
      <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center text-lg font-bold text-gray-600 dark:text-gray-300">
        {stock.symbol.slice(0, 2)}
      </div>

      {/* 종목명 및 심볼 */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 dark:text-white truncate">
          {stock.name}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {stock.symbol} · {marketLabel}
        </p>
      </div>

      {/* 시장 타입 배지 */}
      <div className="flex-shrink-0">
        <span className={`
          px-2 py-1 text-xs font-medium rounded
          ${stock.type === 'kr'
            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
            : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
          }
        `}>
          {stock.type === 'kr' ? '한국' : '미국'}
        </span>
      </div>
    </Link>
  );
}

/**
 * 뉴스 검색 결과 카드 컴포넌트
 *
 * 뉴스 제목, 요약, 출처, 날짜를 표시합니다.
 * 클릭 시 뉴스 상세 페이지로 이동합니다.
 */
function NewsResultCard({
  news,
}: {
  news: NewsItem;
}) {
  return (
    <Link
      href={`/news/${news.id}`}
      className="block p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
    >
      <div className="flex gap-4">
        {/* 뉴스 정보 */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 dark:text-white line-clamp-2">
            {news.title}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 line-clamp-2">
            {news.summary}
          </p>
          {/* 출처 및 태그 */}
          <div className="flex items-center gap-2 mt-3">
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {news.source}
            </span>
            <span className="text-xs text-gray-300 dark:text-gray-600">·</span>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {news.time}
            </span>
            {news.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* 썸네일 이미지 */}
        {news.imageUrl && (
          <div className="w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
            <img
              src={news.imageUrl}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
        )}
      </div>
    </Link>
  );
}

/**
 * 캘린더 검색 결과 카드 컴포넌트
 *
 * 경제 이벤트 정보를 표시합니다.
 * 클릭 시 캘린더 페이지로 이동합니다.
 */
function CalendarResultCard({
  event,
}: {
  event: CalendarEvent;
}) {
  return (
    <Link
      href="/calendar"
      className="block p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
    >
      <div className="flex items-start gap-4">
        {/* 날짜 배지 */}
        <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex flex-col items-center justify-center text-blue-600 dark:text-blue-400">
          <span className="text-xs font-medium">
            {new Date(event.date).getMonth() + 1}월
          </span>
          <span className="text-lg font-bold leading-none">
            {new Date(event.date).getDate()}
          </span>
        </div>

        {/* 이벤트 정보 */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 dark:text-white">
            {event.title}
          </p>
          {event.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">
              {event.description}
            </p>
          )}
          {/* 시간 및 중요도 */}
          <div className="flex items-center gap-2 mt-2">
            {event.time && (
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {event.time}
              </span>
            )}
            <span
              className={`text-xs px-2 py-0.5 rounded ${
                event.importance === "high"
                  ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                  : event.importance === "medium"
                  ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
              }`}
            >
              {event.importance === "high"
                ? "중요"
                : event.importance === "medium"
                ? "보통"
                : "낮음"}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

/**
 * 용어사전 검색 결과 카드 컴포넌트
 *
 * 금융 용어 정보를 표시합니다.
 * 클릭 시 용어사전 페이지로 이동합니다.
 */
function GlossaryResultCard({
  term,
}: {
  term: GlossaryTerm;
}) {
  return (
    <Link
      href={`/glossary?term=${term.id}`}
      className="block p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* 약어 및 한글명 */}
          <p className="font-medium text-gray-900 dark:text-white">
            <span className="text-blue-600 dark:text-blue-400">
              {term.abbreviation}
            </span>
            <span className="text-gray-500 dark:text-gray-400 ml-2">
              {term.korean}
            </span>
          </p>
          {/* 영문 전체명 */}
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {term.fullName}
          </p>
          {/* 설명 */}
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 line-clamp-2">
            {term.description}
          </p>
        </div>
      </div>
    </Link>
  );
}

// ==================== 로컬 검색 유틸리티 ====================

/**
 * 문자열이 검색어를 포함하는지 확인 (대소문자 무시)
 */
function matchesQuery(text: string, query: string): boolean {
  return text.toLowerCase().includes(query.toLowerCase());
}

/**
 * 뉴스 검색 (로컬)
 */
function searchNews(query: string): NewsItem[] {
  if (!query.trim()) return [];
  return newsData.filter((news) => {
    const titleMatch = matchesQuery(news.title, query);
    const tagMatch = news.tags.some((tag) =>
      matchesQuery(tag.replace('#', ''), query)
    );
    return titleMatch || tagMatch;
  });
}

/**
 * 용어사전 검색 (로컬)
 */
function searchGlossary(query: string): GlossaryTerm[] {
  if (!query.trim()) return [];
  return glossaryTerms.filter((term) => {
    const abbreviationMatch = matchesQuery(term.abbreviation, query);
    const koreanMatch = matchesQuery(term.korean, query);
    const fullNameMatch = matchesQuery(term.fullName, query);
    return abbreviationMatch || koreanMatch || fullNameMatch;
  });
}

/**
 * 캘린더 검색 (로컬)
 */
function searchCalendar(query: string): CalendarEvent[] {
  if (!query.trim()) return [];
  return calendarEvents.filter((event) => {
    const titleMatch = matchesQuery(event.title, query);
    const descriptionMatch = event.description
      ? matchesQuery(event.description, query)
      : false;
    return titleMatch || descriptionMatch;
  });
}

// ==================== 검색 결과 타입 ====================

interface LocalSearchResults {
  news: NewsItem[];
  calendar: CalendarEvent[];
  glossary: GlossaryTerm[];
}

/**
 * 검색 결과 메인 컴포넌트
 *
 * URL의 검색어를 기반으로 검색 결과를 표시합니다.
 * - 종목: API 기반 검색 (전체 종목 마스터 데이터)
 * - 뉴스, 캘린더, 용어사전: 로컬 검색
 * 카테고리별 탭으로 필터링할 수 있습니다.
 */
function SearchResultsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams.get("q") || "";

  // 입력값 상태
  const [inputValue, setInputValue] = useState(initialQuery);

  // 로컬 검색 결과 상태 (뉴스, 캘린더, 용어사전)
  const [localResults, setLocalResults] = useState<LocalSearchResults>({
    news: [],
    calendar: [],
    glossary: [],
  });

  // 현재 선택된 카테고리 탭
  const [activeCategory, setActiveCategory] = useState<SearchCategory>("all");

  // 최근 검색어 훅
  const { recentSearches, isMounted, addSearch, removeSearch, clearAll } = useRecentSearches();

  // 인기 검색어 훅 (Firestore 기반)
  const { popularSearches, isLoading: isPopularLoading } = usePopularSearches();

  // API 기반 종목 검색 훅
  const {
    results: stockResults,
    isLoading: isStockLoading,
    search: searchStocks,
    clear: clearStocks,
  } = useStockSearch();

  // 현재 검색어 (URL에서)
  const currentQuery = searchParams.get("q") || "";

  /**
   * 로컬 검색 실행 (뉴스, 캘린더, 용어사전)
   */
  const performLocalSearch = useCallback((query: string) => {
    if (!query.trim()) {
      setLocalResults({ news: [], calendar: [], glossary: [] });
      return;
    }
    setLocalResults({
      news: searchNews(query),
      calendar: searchCalendar(query),
      glossary: searchGlossary(query),
    });
  }, []);

  /**
   * URL 쿼리 파라미터 변경 시 검색 실행
   * 검색어를 최근 검색어에 자동 저장합니다.
   */
  useEffect(() => {
    const query = searchParams.get("q") || "";
    setInputValue(query);

    if (query.trim()) {
      // API 기반 종목 검색
      searchStocks(query);
      // 로컬 검색 (뉴스, 캘린더, 용어사전)
      performLocalSearch(query);
      // 최근 검색어에 추가
      addSearch(query.trim());
    } else {
      clearStocks();
      setLocalResults({ news: [], calendar: [], glossary: [] });
    }
  }, [searchParams, performLocalSearch, addSearch, searchStocks, clearStocks]);

  /**
   * 검색 버튼 클릭 핸들러
   * 입력된 검색어로 검색 페이지를 갱신합니다.
   */
  const handleSearch = () => {
    if (inputValue.trim()) {
      router.push(`/search?q=${encodeURIComponent(inputValue.trim())}`);
    }
  };

  // 전체 결과 개수 계산
  const totalCount =
    stockResults.length +
    localResults.news.length +
    localResults.calendar.length +
    localResults.glossary.length;

  // 검색어가 있는지 확인
  const hasQuery = !!currentQuery.trim();

  /**
   * 각 카테고리별 결과 개수
   */
  const getCategoryCount = (category: SearchCategory) => {
    switch (category) {
      case "stocks":
        return stockResults.length;
      case "news":
        return localResults.news.length;
      case "calendar":
        return localResults.calendar.length;
      case "glossary":
        return localResults.glossary.length;
      case "all":
        return totalCount;
    }
  };

  /**
   * 필터된 결과 가져오기
   */
  const shouldShowStocks = activeCategory === "all" || activeCategory === "stocks";
  const shouldShowNews = activeCategory === "all" || activeCategory === "news";
  const shouldShowCalendar = activeCategory === "all" || activeCategory === "calendar";
  const shouldShowGlossary = activeCategory === "all" || activeCategory === "glossary";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* 모바일 헤더 */}
      <MobileSearchHeader title="검색" />

      {/* 사이드바 */}
      <Sidebar activeMenu="search" />

      {/* 메인 콘텐츠 */}
      <main className="md:ml-[72px] lg:ml-60 pt-14 md:pt-0 pb-20 md:pb-0">
        <div className="max-w-3xl mx-auto px-4 py-6">
          {/* ========================================
              검색 입력 - 반응형 처리
              - 모바일: MobileSearchHeader에서 처리 (숨김)
              - 데스크톱: GlobalSearch 사용 (드롭다운에 최근 본 종목 + 최근 검색어)
              ======================================== */}
          <div className="hidden md:block">
            <GlobalSearch />
          </div>
          {/* ========================================
              모바일 검색 입력
              - md 이하에서만 표시
              - disableDropdown: 페이지 하단에 인기 검색어가 있으므로 드롭다운 비활성화
              ======================================== */}
          <div className="md:hidden">
            <SearchInput
              value={inputValue}
              onChange={setInputValue}
              onSearch={handleSearch}
              disableDropdown
            />
          </div>

          {/* 카테고리 탭 */}
          {hasQuery && (
            <div className="flex gap-2 mt-6 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0">
              {searchCategoryFilters.map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setActiveCategory(filter.id)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    activeCategory === filter.id
                      ? "bg-blue-600 text-white"
                      : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
                >
                  <span>{filter.emoji}</span>
                  <span>{filter.label}</span>
                  <span
                    className={`ml-1 text-xs ${
                      activeCategory === filter.id
                        ? "text-blue-100"
                        : "text-gray-400 dark:text-gray-500"
                    }`}
                  >
                    {getCategoryCount(filter.id)}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* 검색 결과 */}
          {hasQuery && (
            <div className="mt-6 space-y-6">
              {/* 로딩 상태 */}
              {isStockLoading && (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-gray-300 dark:border-gray-600 border-t-blue-500 rounded-full animate-spin" />
                  <span className="ml-3 text-gray-500 dark:text-gray-400">
                    종목 검색 중...
                  </span>
                </div>
              )}

              {/* 결과 없음 */}
              {!isStockLoading && totalCount === 0 && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                    <svg
                      className="w-8 h-8 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <p className="text-gray-500 dark:text-gray-400">
                    &quot;{currentQuery}&quot;에 대한 검색 결과가 없습니다
                  </p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                    다른 검색어로 다시 시도해보세요
                  </p>
                </div>
              )}

              {/* 종목 결과 (API 기반) */}
              {shouldShowStocks && stockResults.length > 0 && (
                <section>
                  <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                    📈 종목 ({stockResults.length})
                  </h2>
                  <div className="space-y-3">
                    {stockResults.map((stock) => (
                      <StockResultCard
                        key={`${stock.type}-${stock.symbol}`}
                        stock={stock}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* 뉴스 결과 */}
              {shouldShowNews && localResults.news.length > 0 && (
                <section>
                  <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                    📰 뉴스 ({localResults.news.length})
                  </h2>
                  <div className="space-y-3">
                    {localResults.news.map((news) => (
                      <NewsResultCard key={news.id} news={news} />
                    ))}
                  </div>
                </section>
              )}

              {/* 캘린더 결과 */}
              {shouldShowCalendar && localResults.calendar.length > 0 && (
                <section>
                  <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                    📅 캘린더 ({localResults.calendar.length})
                  </h2>
                  <div className="space-y-3">
                    {localResults.calendar.map((event) => (
                      <CalendarResultCard
                        key={event.id}
                        event={event}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* 용어사전 결과 */}
              {shouldShowGlossary && localResults.glossary.length > 0 && (
                <section>
                  <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                    📖 용어사전 ({localResults.glossary.length})
                  </h2>
                  <div className="space-y-3">
                    {localResults.glossary.map((term) => (
                      <GlossaryResultCard
                        key={term.id}
                        term={term}
                      />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}

          {/* ========================================
              초기 상태 (검색 전)
              - 데스크톱: GlobalSearch 드롭다운에서 최근 본 종목/최근 검색어 표시
              - 모바일: 페이지에 직접 최근 검색어/인기 검색어 표시
              ======================================== */}
          {!hasQuery && (
            <div className="py-8 text-center">
              {/* 검색 안내 아이콘 */}
              <div className="w-16 h-16 mx-auto bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4">
                <svg
                  className="w-8 h-8 text-blue-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                검색어를 입력하세요
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                종목, 뉴스, 용어를 검색할 수 있어요
              </p>

              {/* ========================================
                  최근 검색어 섹션 (모바일 전용)
                  - 데스크톱은 GlobalSearch 드롭다운에서 표시하므로 숨김
                  ======================================== */}
              {isMounted && recentSearches.length > 0 && (
                <div className="mt-8 md:hidden">
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <span className="text-lg">🕐</span>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      최근 검색어
                    </p>
                    <button
                      onClick={clearAll}
                      className="ml-2 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      전체 삭제
                    </button>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2">
                    {recentSearches.slice(0, 8).map((query) => (
                      <div
                        key={`recent-page-${query}`}
                        className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg group"
                      >
                        <button
                          onClick={() => {
                            setInputValue(query);
                            router.push(`/search?q=${encodeURIComponent(query)}`);
                          }}
                          className="text-gray-600 dark:text-gray-400 text-sm hover:text-gray-900 dark:hover:text-white"
                        >
                          {query}
                        </button>
                        <button
                          onClick={() => removeSearch(query)}
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ========================================
                  인기 검색어 섹션
                  - Firestore에서 실시간 집계된 인기 검색어 표시
                  - 최근 7일간 가장 많이 검색된 검색어
                  ======================================== */}
              <div className="mt-8">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <span className="text-lg">🔥</span>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    인기 검색어
                  </p>
                </div>
                {/* 로딩 상태 */}
                {isPopularLoading ? (
                  <div className="flex flex-wrap justify-center gap-2">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div
                        key={i}
                        className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-wrap justify-center gap-2">
                    {popularSearches.map((item) => (
                      <button
                        key={`popular-${item.query}`}
                        onClick={() => {
                          setInputValue(item.query);
                          router.push(`/search?q=${encodeURIComponent(item.query)}`);
                        }}
                        className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-lg text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                      >
                        {item.query}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

/**
 * 메인 페이지 컴포넌트 (Suspense 래핑)
 *
 * useSearchParams 훅을 사용하기 위해 Suspense로 래핑합니다.
 */
export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-gray-300 dark:border-gray-600 border-t-blue-500 rounded-full animate-spin" />
        </div>
      }
    >
      <SearchResultsContent />
    </Suspense>
  );
}
