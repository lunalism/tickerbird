/**
 * Hooks 모듈 내보내기
 */

export {
  // 기존 시세 조회 훅 (한국)
  useKoreanIndices,
  useKoreanStocks,
  useKoreanStockPrice,
  useKoreanIndexPrice,
  // 순위 조회 훅 (한국투자증권 순위 API)
  useVolumeRanking,
  useFluctuationRanking,
  useMarketCapRanking,
  // ETF 조회 훅 (한국)
  useKoreanETFs,
  // 미국 시장 조회 훅
  useUSIndices,
  useUSVolumeRanking,
  useUSFluctuationRanking,
  useUSMarketCapRanking,
  useUSETFs,
  useUSStocks,  // 미국 주식 개별 시세 (시가총액순위 API 폴백)
  useUSStockPrice,  // 미국 주식 개별 시세 조회 (종목 상세 페이지용)
  // 상수
  KOREAN_INDICES,
  KOREAN_STOCKS,
  // 타입
  type ETFPriceData,
  type USETFPriceData,
  type USStockPriceData,
  type USStockPriceResponse,  // 미국 주식 개별 시세 응답 타입
} from './useKISData';

// 관심종목 관리 훅
export { useWatchlist, type WatchlistItem } from './useWatchlist';

// 최근 검색어 관리 훅
export { useRecentSearches } from './useRecentSearches';

// 종목 검색 훅
export {
  useStockSearch,
  type StockSearchResult,
  type KoreanSearchResult,
  type USSearchResult,
  type SearchOptions,
} from './useStockSearch';

// 뉴스 훅
export { useNews, useMultiCategoryNews } from './useNews';

// 최근 본 종목 관리 훅
export { useRecentlyViewed } from './useRecentlyViewed';

// 가격 알림 관리 훅
export { useAlerts } from './useAlerts';

// 가격 알림 발동 체크 훅
export { usePriceAlertCheck, type PriceData } from './usePriceAlertCheck';

// 커뮤니티 훅
export { useCommunity, useComments, useTickerCommunity } from './useCommunity';

// 경제 캘린더 훅
export { useCalendarEvents } from './useCalendarEvents';

// 인기 검색어 훅
export { usePopularSearches, type PopularSearchItem } from './usePopularSearches';

// 관리자 권한 훅
export { useAdmin } from './useAdmin';
