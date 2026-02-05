"use client";

/**
 * 검색 페이지 (/search)
 *
 * 통합 검색 페이지입니다. 모든 플랫폼에서 검색 아이콘 클릭 시 이 페이지로 이동합니다.
 *
 * 레이아웃:
 * ┌─────────────────────────────────┐
 * │ 🔍 종목명, 티커를 검색하세요      │  ← 검색 입력창
 * ├─────────────────────────────────┤
 * │ 🕐 최근 검색어           전체삭제 │  ← 최근 검색어 섹션
 * │ [팔란티어] [삼성전자] [META]      │
 * │                                 │
 * │ 👀 최근 본 종목                  │  ← 최근 본 종목 섹션
 * │ ┌─────────────────────────────┐ │
 * │ │ US  메타 플랫폼스             │ │
 * │ └─────────────────────────────┘ │
 * │                                 │
 * │ 🔥 인기 검색어                   │  ← 인기 검색어 섹션
 * │ [삼성전자] [NVIDIA] [테슬라]     │
 * └─────────────────────────────────┘
 *
 * 검색어 입력 시:
 * - 위 섹션들 숨김
 * - 검색 결과만 표시
 *
 * 기능:
 * - URL: /search?q=검색어
 * - 검색 대상: 종목명, 티커, 뉴스 제목, 캘린더 이벤트, 용어사전
 * - 카테고리별 탭 필터: 전체 | 종목 | 뉴스 | 캘린더 | 용어사전
 * - 반응형 UI (데스크톱/태블릿/모바일 동일)
 * - 다크모드 지원
 */

import { useState, useEffect, useCallback, Suspense, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Sidebar } from "@/components/layout";
import { MobileSearchHeader } from "@/components/features/search";
import { searchCategoryFilters } from "@/utils/search";
import {
  useRecentSearches,
  useStockSearch,
  usePopularSearches,
  useRecentlyViewed,
  type StockSearchResult,
} from "@/hooks";
import { newsData } from "@/constants/news";
import { glossaryTerms } from "@/constants/glossary";
import { calendarEvents } from "@/constants/calendar";
import type { SearchCategory, NewsItem, GlossaryTerm, CalendarEvent, EventCategory } from "@/types";

// ==================== 검색 입력 컴포넌트 ====================

/**
 * 검색 입력 컴포넌트
 *
 * 단순한 검색 입력창입니다. 드롭다운 없음!
 * 모든 검색 관련 UI는 페이지에 직접 표시됩니다.
 */
function SearchInput({
  value,
  onChange,
  onSearch,
}: {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  /**
   * 입력값 변경 핸들러
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  /**
   * 키보드 이벤트 핸들러
   * Enter 키 입력 시 검색 실행
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      onSearch();
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
        placeholder="종목명, 티커를 검색하세요"
        className="w-full pl-12 pr-10 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
        autoFocus
      />

      {/* 검색어 지우기 버튼 */}
      {value && (
        <button
          type="button"
          onClick={() => {
            onChange("");
            inputRef.current?.focus();
          }}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

// ==================== 검색 결과 카드 컴포넌트들 ====================

/**
 * 종목 검색 결과 카드 컴포넌트
 */
function StockResultCard({ stock }: { stock: StockSearchResult }) {
  const marketLabel = stock.type === 'kr' ? stock.market : stock.exchange;
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
 */
function NewsResultCard({ news }: { news: NewsItem }) {
  return (
    <Link
      href={`/news/${news.id}`}
      className="block p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
    >
      <div className="flex gap-4">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 dark:text-white line-clamp-2">
            {news.title}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 line-clamp-2">
            {news.summary}
          </p>
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
        {news.imageUrl && (
          <div className="w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
            <img src={news.imageUrl} alt="" className="w-full h-full object-cover" />
          </div>
        )}
      </div>
    </Link>
  );
}

/**
 * 캘린더 검색 결과 카드 컴포넌트
 */
function CalendarResultCard({ event }: { event: CalendarEvent }) {
  // 카테고리별 뱃지 색상 설정
  // - 경제지표: 파란색, 실적발표: 초록색, 기업이벤트: 주황색, 암호화폐: 보라색
  const categoryColors: Record<EventCategory, string> = {
    institution: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
    earnings: "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400",
    corporate: "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400",
    crypto: "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400",
    options: "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400",
    dividend: "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400",
  };

  // 카테고리별 한글 라벨
  const categoryLabels: Record<EventCategory, string> = {
    institution: "경제지표",
    earnings: "실적발표",
    corporate: "기업이벤트",
    crypto: "암호화폐",
    options: "옵션만기",
    dividend: "배당",
  };

  // 중요 이벤트는 테두리 추가하여 강조 표시
  const ringClass = event.importance === "high" ? "ring-2 ring-current ring-offset-1 dark:ring-offset-gray-800" : "";

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
          <div className="flex items-center gap-2 mt-2">
            {event.time && (
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {event.time}
              </span>
            )}
            {/* 카테고리 뱃지 - 중요 이벤트는 테두리로 강조 */}
            <span
              className={`text-xs px-2 py-0.5 rounded ${categoryColors[event.category]} ${ringClass}`}
            >
              {categoryLabels[event.category]}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

/**
 * 용어사전 검색 결과 카드 컴포넌트
 */
function GlossaryResultCard({ term }: { term: GlossaryTerm }) {
  return (
    <Link
      href={`/glossary?term=${term.id}`}
      className="block p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 dark:text-white">
            <span className="text-blue-600 dark:text-blue-400">{term.abbreviation}</span>
            <span className="text-gray-500 dark:text-gray-400 ml-2">{term.korean}</span>
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {term.fullName}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 line-clamp-2">
            {term.description}
          </p>
        </div>
      </div>
    </Link>
  );
}

// ==================== 로컬 검색 유틸리티 ====================

function matchesQuery(text: string, query: string): boolean {
  return text.toLowerCase().includes(query.toLowerCase());
}

function searchNews(query: string): NewsItem[] {
  if (!query.trim()) return [];
  return newsData.filter((news) => {
    const titleMatch = matchesQuery(news.title, query);
    const tagMatch = news.tags.some((tag) => matchesQuery(tag.replace('#', ''), query));
    return titleMatch || tagMatch;
  });
}

function searchGlossary(query: string): GlossaryTerm[] {
  if (!query.trim()) return [];
  return glossaryTerms.filter((term) => {
    const abbreviationMatch = matchesQuery(term.abbreviation, query);
    const koreanMatch = matchesQuery(term.korean, query);
    const fullNameMatch = matchesQuery(term.fullName, query);
    return abbreviationMatch || koreanMatch || fullNameMatch;
  });
}

function searchCalendar(query: string): CalendarEvent[] {
  if (!query.trim()) return [];
  return calendarEvents.filter((event) => {
    const titleMatch = matchesQuery(event.title, query);
    const descriptionMatch = event.description ? matchesQuery(event.description, query) : false;
    return titleMatch || descriptionMatch;
  });
}

interface LocalSearchResults {
  news: NewsItem[];
  calendar: CalendarEvent[];
  glossary: GlossaryTerm[];
}

// ==================== 메인 컴포넌트 ====================

/**
 * 검색 결과 메인 컴포넌트
 */
function SearchResultsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams.get("q") || "";

  // 입력값 상태
  const [inputValue, setInputValue] = useState(initialQuery);

  // 로컬 검색 결과 상태
  const [localResults, setLocalResults] = useState<LocalSearchResults>({
    news: [],
    calendar: [],
    glossary: [],
  });

  // 현재 선택된 카테고리 탭
  const [activeCategory, setActiveCategory] = useState<SearchCategory>("all");

  // 최근 검색어 훅
  const { recentSearches, isMounted, addSearch, removeSearch, clearAll } = useRecentSearches();

  // 최근 본 종목 훅
  const { recentlyViewed, isLoaded: isRecentlyViewedLoaded } = useRecentlyViewed();

  // 인기 검색어 훅
  const { popularSearches, isLoading: isPopularLoading } = usePopularSearches();

  // 종목 검색 훅
  const {
    results: stockResults,
    isLoading: isStockLoading,
    search: searchStocks,
    clear: clearStocks,
  } = useStockSearch();

  // 현재 검색어 (URL에서)
  const currentQuery = searchParams.get("q") || "";

  /**
   * 로컬 검색 실행
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
   */
  useEffect(() => {
    const query = searchParams.get("q") || "";
    setInputValue(query);

    if (query.trim()) {
      searchStocks(query);
      performLocalSearch(query);
      addSearch(query.trim());
    } else {
      clearStocks();
      setLocalResults({ news: [], calendar: [], glossary: [] });
    }
  }, [searchParams, performLocalSearch, addSearch, searchStocks, clearStocks]);

  /**
   * 검색 실행
   */
  const handleSearch = () => {
    if (inputValue.trim()) {
      router.push(`/search?q=${encodeURIComponent(inputValue.trim())}`);
    }
  };

  // 전체 결과 개수
  const totalCount =
    stockResults.length +
    localResults.news.length +
    localResults.calendar.length +
    localResults.glossary.length;

  // 검색어가 있는지 (URL 또는 입력 중)
  const hasQuery = !!currentQuery.trim();
  const isTyping = !!inputValue.trim();

  /**
   * 카테고리별 결과 개수
   */
  const getCategoryCount = (category: SearchCategory) => {
    switch (category) {
      case "stocks": return stockResults.length;
      case "news": return localResults.news.length;
      case "calendar": return localResults.calendar.length;
      case "glossary": return localResults.glossary.length;
      case "all": return totalCount;
    }
  };

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
              검색 입력창
              - 모든 플랫폼에서 동일하게 표시
              ======================================== */}
          <SearchInput
            value={inputValue}
            onChange={setInputValue}
            onSearch={handleSearch}
          />

          {/* 카테고리 탭 (검색 결과가 있을 때만) */}
          {hasQuery && (
            <div className="flex gap-2 mt-6 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
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
                  <span className={`ml-1 text-xs ${
                    activeCategory === filter.id ? "text-blue-100" : "text-gray-400 dark:text-gray-500"
                  }`}>
                    {getCategoryCount(filter.id)}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* ========================================
              검색 결과 (검색어가 있을 때)
              ======================================== */}
          {hasQuery && (
            <div className="mt-6 space-y-6">
              {/* 로딩 상태 */}
              {isStockLoading && (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-gray-300 dark:border-gray-600 border-t-blue-500 rounded-full animate-spin" />
                  <span className="ml-3 text-gray-500 dark:text-gray-400">검색 중...</span>
                </div>
              )}

              {/* 결과 없음 */}
              {!isStockLoading && totalCount === 0 && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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

              {/* 종목 결과 */}
              {shouldShowStocks && stockResults.length > 0 && (
                <section>
                  <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                    📈 종목 ({stockResults.length})
                  </h2>
                  <div className="space-y-3">
                    {stockResults.map((stock) => (
                      <StockResultCard key={`${stock.type}-${stock.symbol}`} stock={stock} />
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
                      <CalendarResultCard key={event.id} event={event} />
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
                      <GlossaryResultCard key={term.id} term={term} />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}

          {/* ========================================
              초기 상태 (검색어 없을 때)
              - 최근 검색어
              - 최근 본 종목
              - 인기 검색어
              ======================================== */}
          {!hasQuery && !isTyping && (
            <div className="mt-8 space-y-8">
              {/* ========================================
                  최근 검색어 섹션
                  ======================================== */}
              {isMounted && recentSearches.length > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🕐</span>
                      <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        최근 검색어
                      </h2>
                    </div>
                    <button
                      onClick={clearAll}
                      className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                      전체 삭제
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {recentSearches.slice(0, 10).map((query) => (
                      <div
                        key={`recent-${query}`}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg group hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
                      >
                        <button
                          onClick={() => {
                            setInputValue(query);
                            router.push(`/search?q=${encodeURIComponent(query)}`);
                          }}
                          className="text-sm text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
                        >
                          {query}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeSearch(query);
                          }}
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* ========================================
                  최근 본 종목 섹션
                  ======================================== */}
              {isRecentlyViewedLoaded && recentlyViewed.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-lg">👀</span>
                    <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      최근 본 종목
                    </h2>
                  </div>
                  {/* 가로 스크롤 카드 */}
                  <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
                    {recentlyViewed.slice(0, 10).map((stock) => (
                      <Link
                        key={`viewed-${stock.ticker}`}
                        href={`/market/${stock.ticker}?market=${stock.market}`}
                        className="flex-shrink-0 w-[140px] p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
                      >
                        {/* 시장 배지 */}
                        <span className={`inline-block px-1.5 py-0.5 text-[10px] font-medium rounded mb-2 ${
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
                        {/* 티커 */}
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">
                          {stock.ticker}
                        </p>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {/* ========================================
                  인기 검색어 섹션
                  ======================================== */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-lg">🔥</span>
                  <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    인기 검색어
                  </h2>
                </div>
                {isPopularLoading ? (
                  <div className="flex flex-wrap gap-2">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div key={i} className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {popularSearches.map((item) => (
                      <button
                        key={`popular-${item.query}`}
                        onClick={() => {
                          setInputValue(item.query);
                          router.push(`/search?q=${encodeURIComponent(item.query)}`);
                        }}
                        className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:border-blue-500 dark:hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      >
                        {item.query}
                      </button>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

/**
 * 메인 페이지 컴포넌트
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
