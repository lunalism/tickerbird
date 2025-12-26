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
  // 상수
  KOREAN_INDICES,
  KOREAN_STOCKS,
  // 타입
  type ETFPriceData,
  type USETFPriceData,
  type USStockPriceData,
} from './useKISData';

// 관심종목 관리 훅
export { useWatchlist, type WatchlistItem } from './useWatchlist';

// 최근 검색어 관리 훅
export { useRecentSearches } from './useRecentSearches';
