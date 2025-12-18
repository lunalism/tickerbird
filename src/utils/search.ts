/**
 * 검색 유틸리티 함수
 * - 목업 데이터 기반 검색 로직
 * - 뉴스, 종목, 용어사전, 캘린더 검색
 */

import {
  GroupedSearchResults,
  SearchResults,
  StockSearchResult,
  NewsSearchResult,
  CalendarSearchResult,
  GlossarySearchResult,
} from '@/types';
import { newsData } from '@/constants/news';
import { popularStocks, stocksBySector } from '@/constants/market';
import { glossaryTerms } from '@/constants/glossary';
import { calendarEvents } from '@/constants/calendar';
import type { MarketRegion, Stock } from '@/types';

/**
 * 문자열이 검색어를 포함하는지 확인 (대소문자 무시)
 */
function matchesQuery(text: string, query: string): boolean {
  return text.toLowerCase().includes(query.toLowerCase());
}

/**
 * 뉴스 검색
 * - 제목, 태그에서 검색
 */
function searchNews(query: string): NewsSearchResult[] {
  if (!query.trim()) return [];

  return newsData
    .filter((news) => {
      // 제목에서 검색
      const titleMatch = matchesQuery(news.title, query);
      // 태그에서 검색 (# 제거 후 검색)
      const tagMatch = news.tags.some((tag) =>
        matchesQuery(tag.replace('#', ''), query)
      );
      return titleMatch || tagMatch;
    })
    .map((news) => ({
      type: 'news' as const,
      item: news,
    }));
}

/**
 * 종목 검색
 * - 종목명, 티커에서 검색
 * - 모든 시장(미국, 한국, 일본, 홍콩)에서 검색
 */
function searchStocks(query: string): StockSearchResult[] {
  if (!query.trim()) return [];

  const results: StockSearchResult[] = [];
  const markets: MarketRegion[] = ['us', 'kr', 'jp', 'hk'];

  // popularStocks와 stocksBySector 모두에서 검색
  const allStocksMap = new Map<string, { stock: Stock; market: MarketRegion }>();

  // popularStocks에서 수집
  markets.forEach((market) => {
    popularStocks[market]?.forEach((stock) => {
      const key = `${market}-${stock.ticker}`;
      if (!allStocksMap.has(key)) {
        allStocksMap.set(key, { stock, market });
      }
    });
  });

  // stocksBySector에서 수집 (중복 제거)
  markets.forEach((market) => {
    stocksBySector[market]?.forEach((stock) => {
      const key = `${market}-${stock.ticker}`;
      if (!allStocksMap.has(key)) {
        allStocksMap.set(key, { stock, market });
      }
    });
  });

  // 검색 수행
  allStocksMap.forEach(({ stock, market }) => {
    const nameMatch = matchesQuery(stock.name, query);
    const tickerMatch = matchesQuery(stock.ticker, query);

    if (nameMatch || tickerMatch) {
      results.push({
        type: 'stock',
        item: stock,
        market,
      });
    }
  });

  return results;
}

/**
 * 용어사전 검색
 * - 약어, 한글명에서 검색
 */
function searchGlossary(query: string): GlossarySearchResult[] {
  if (!query.trim()) return [];

  return glossaryTerms
    .filter((term) => {
      // 약어에서 검색
      const abbreviationMatch = matchesQuery(term.abbreviation, query);
      // 한글명에서 검색
      const koreanMatch = matchesQuery(term.korean, query);
      // 영문 전체명에서 검색
      const fullNameMatch = matchesQuery(term.fullName, query);
      return abbreviationMatch || koreanMatch || fullNameMatch;
    })
    .map((term) => ({
      type: 'glossary' as const,
      item: term,
    }));
}

/**
 * 캘린더 이벤트 검색
 * - 이벤트명에서 검색
 */
function searchCalendar(query: string): CalendarSearchResult[] {
  if (!query.trim()) return [];

  return calendarEvents
    .filter((event) => {
      // 이벤트 제목에서 검색
      const titleMatch = matchesQuery(event.title, query);
      // 설명에서 검색
      const descriptionMatch = event.description
        ? matchesQuery(event.description, query)
        : false;
      return titleMatch || descriptionMatch;
    })
    .map((event) => ({
      type: 'calendar' as const,
      item: event,
    }));
}

/**
 * 통합 검색 함수
 * - 모든 카테고리에서 검색하여 그룹화된 결과 반환
 */
export function search(query: string): SearchResults {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return {
      query: '',
      results: {
        stocks: [],
        news: [],
        calendar: [],
        glossary: [],
      },
      totalCount: 0,
    };
  }

  const stocks = searchStocks(trimmedQuery);
  const news = searchNews(trimmedQuery);
  const calendar = searchCalendar(trimmedQuery);
  const glossary = searchGlossary(trimmedQuery);

  const results: GroupedSearchResults = {
    stocks,
    news,
    calendar,
    glossary,
  };

  const totalCount =
    stocks.length + news.length + calendar.length + glossary.length;

  return {
    query: trimmedQuery,
    results,
    totalCount,
  };
}

/**
 * 검색 결과 제한 함수
 * - 드롭다운용으로 각 카테고리별 최대 개수 제한
 */
export function limitSearchResults(
  results: GroupedSearchResults,
  limits: { stocks: number; news: number; calendar: number; glossary: number }
): GroupedSearchResults {
  return {
    stocks: results.stocks.slice(0, limits.stocks),
    news: results.news.slice(0, limits.news),
    calendar: results.calendar.slice(0, limits.calendar),
    glossary: results.glossary.slice(0, limits.glossary),
  };
}

/**
 * 검색 카테고리 필터
 */
export const searchCategoryFilters = [
  { id: 'all' as const, label: '전체', emoji: '🔍' },
  { id: 'stocks' as const, label: '종목', emoji: '📈' },
  { id: 'news' as const, label: '뉴스', emoji: '📰' },
  { id: 'calendar' as const, label: '캘린더', emoji: '📅' },
  { id: 'glossary' as const, label: '용어사전', emoji: '📖' },
];
