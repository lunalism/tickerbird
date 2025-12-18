/**
 * 검색 관련 타입 정의
 * - 검색 결과 카테고리 및 아이템 타입
 */

import { NewsItem, Stock, GlossaryTerm, CalendarEvent } from '@/types';

// 검색 결과 카테고리
export type SearchCategory = 'all' | 'stocks' | 'news' | 'calendar' | 'glossary';

// 검색 카테고리 필터 타입
export interface SearchCategoryFilter {
  id: SearchCategory;
  label: string;
  emoji: string;
}

// 종목 검색 결과 아이템
export interface StockSearchResult {
  type: 'stock';
  item: Stock;
  market: 'us' | 'kr' | 'jp' | 'hk';
}

// 뉴스 검색 결과 아이템
export interface NewsSearchResult {
  type: 'news';
  item: NewsItem;
}

// 캘린더 검색 결과 아이템
export interface CalendarSearchResult {
  type: 'calendar';
  item: CalendarEvent;
}

// 용어사전 검색 결과 아이템
export interface GlossarySearchResult {
  type: 'glossary';
  item: GlossaryTerm;
}

// 통합 검색 결과 아이템
export type SearchResultItem =
  | StockSearchResult
  | NewsSearchResult
  | CalendarSearchResult
  | GlossarySearchResult;

// 그룹화된 검색 결과
export interface GroupedSearchResults {
  stocks: StockSearchResult[];
  news: NewsSearchResult[];
  calendar: CalendarSearchResult[];
  glossary: GlossarySearchResult[];
}

// 전체 검색 결과
export interface SearchResults {
  query: string;
  results: GroupedSearchResults;
  totalCount: number;
}
