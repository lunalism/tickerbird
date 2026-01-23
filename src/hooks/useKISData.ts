/**
 * 한국투자증권 Open API 데이터 페칭 훅
 *
 * @description
 * 한국 시장 데이터를 실시간으로 가져오는 커스텀 훅입니다.
 * - useKoreanIndices(): 한국 지수 (코스피, 코스닥, 코스피200)
 * - useKoreanStocks(): 한국 주식 (삼성전자, SK하이닉스 등 주요 종목)
 * - useKoreanStockPrice(): 개별 종목 현재가
 *
 * 사용 예시:
 * ```tsx
 * const { indices, isLoading, error, refetch } = useKoreanIndices();
 * const { stocks, isLoading, error, refetch } = useKoreanStocks();
 * ```
 *
 * @see /src/lib/kis-api.ts - API 유틸리티
 * @see /src/types/kis.ts - 타입 정의
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import type {
  StockPriceData,
  IndexPriceData,
  VolumeRankingData,
  FluctuationRankingData,
  MarketCapRankingData,
} from '@/types/kis';
import type { MarketIndex, Stock } from '@/types/market';

// ==================== 상수 정의 ====================

/**
 * 한국 주요 지수 목록
 * - 0001: 코스피 (KOSPI)
 * - 1001: 코스닥 (KOSDAQ)
 * - 2001: 코스피200
 */
export const KOREAN_INDICES = [
  { code: '0001', name: '코스피', id: 'kospi' },
  { code: '1001', name: '코스닥', id: 'kosdaq' },
  { code: '2001', name: '코스피200', id: 'kospi200' },
];

/**
 * 한국 주요 종목 목록
 * 시가총액 상위 종목들
 */
export const KOREAN_STOCKS = [
  { symbol: '005930', name: '삼성전자', domain: 'samsung.com' },
  { symbol: '000660', name: 'SK하이닉스', domain: 'skhynix.com' },
  { symbol: '373220', name: 'LG에너지솔루션', domain: 'lgensol.com' },
  { symbol: '005380', name: '현대차', domain: 'hyundai.com' },
  { symbol: '000270', name: '기아', domain: 'kia.com' },
  { symbol: '035420', name: 'NAVER', domain: 'navercorp.com' },
  { symbol: '035720', name: '카카오', domain: 'kakaocorp.com' },
  { symbol: '006400', name: '삼성SDI', domain: 'samsungsdi.co.kr' },
];

/**
 * 자동 새로고침 간격 (밀리초)
 * 기본값: 60초 (1분)
 */
const DEFAULT_REFRESH_INTERVAL = 60000;

// ==================== 유틸리티 함수 ====================

/**
 * 거래량 포맷팅
 * 1백만 이상: xxM, 1천 이상: xxK
 */
function formatVolume(volume: number): string {
  if (volume >= 1000000) {
    return (volume / 1000000).toFixed(1) + 'M';
  }
  if (volume >= 1000) {
    return (volume / 1000).toFixed(1) + 'K';
  }
  return volume.toString();
}

/**
 * 차트 데이터 생성 (현재가 기준 ±5% 범위의 가상 데이터)
 * TODO: 실제 일별 시세 API 연동 시 대체
 */
function generateChartData(currentPrice: number, changePercent: number): number[] {
  const basePrice = currentPrice / (1 + changePercent / 100);
  const data: number[] = [];
  for (let i = 0; i < 9; i++) {
    const progress = i / 8;
    const noise = (Math.random() - 0.5) * 0.01 * currentPrice;
    const price = basePrice + (currentPrice - basePrice) * progress + noise;
    data.push(Math.round(price * 100) / 100);
  }
  return data;
}

// ==================== 한국 지수 훅 ====================

interface UseKoreanIndicesResult {
  indices: MarketIndex[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * 한국 지수 데이터 훅
 *
 * @param autoRefresh 자동 새로고침 여부 (기본: false)
 * @param refreshInterval 새로고침 간격 (밀리초, 기본: 60초)
 * @returns 지수 데이터, 로딩 상태, 에러, refetch 함수
 *
 * @example
 * ```tsx
 * const { indices, isLoading, error, refetch } = useKoreanIndices({ autoRefresh: true });
 * ```
 */
export function useKoreanIndices(options?: {
  autoRefresh?: boolean;
  refreshInterval?: number;
}): UseKoreanIndicesResult {
  const { autoRefresh = false, refreshInterval = DEFAULT_REFRESH_INTERVAL } = options || {};

  const [indices, setIndices] = useState<MarketIndex[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * 지수 데이터 가져오기
   */
  const fetchIndices = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const results: MarketIndex[] = [];

      // 순차적으로 API 호출 (rate limit 고려)
      for (const index of KOREAN_INDICES) {
        try {
          const response = await fetch(`/api/kis/index/price?indexCode=${index.code}`);
          const data: IndexPriceData = await response.json();

          if (response.ok && data.currentValue) {
            results.push({
              id: index.id,
              name: data.indexName || index.name,
              value: data.currentValue,
              change: data.change,
              changePercent: data.changePercent,
              chartData: generateChartData(data.currentValue, data.changePercent),
            });
          } else {
            console.warn(`[useKoreanIndices] ${index.name} 조회 실패:`, data);
          }
        } catch (err) {
          console.error(`[useKoreanIndices] ${index.name} API 에러:`, err);
        }

        // API 호출 간 딜레이 (100ms)
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      setIndices(results);

      if (results.length === 0) {
        setError('지수 데이터를 가져올 수 없습니다.');
      }
    } catch (err) {
      console.error('[useKoreanIndices] 전체 에러:', err);
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 초기 로드
  useEffect(() => {
    fetchIndices();
  }, [fetchIndices]);

  // 자동 새로고침
  useEffect(() => {
    if (!autoRefresh) return;

    const intervalId = setInterval(fetchIndices, refreshInterval);
    return () => clearInterval(intervalId);
  }, [autoRefresh, refreshInterval, fetchIndices]);

  return { indices, isLoading, error, refetch: fetchIndices };
}

// ==================== 한국 주식 훅 ====================

interface UseKoreanStocksResult {
  stocks: Stock[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * 한국 주식 데이터 훅
 *
 * @param autoRefresh 자동 새로고침 여부 (기본: false)
 * @param refreshInterval 새로고침 간격 (밀리초, 기본: 60초)
 * @returns 주식 데이터, 로딩 상태, 에러, refetch 함수
 *
 * @example
 * ```tsx
 * const { stocks, isLoading, error, refetch } = useKoreanStocks({ autoRefresh: true });
 * ```
 */
export function useKoreanStocks(options?: {
  autoRefresh?: boolean;
  refreshInterval?: number;
}): UseKoreanStocksResult {
  const { autoRefresh = false, refreshInterval = DEFAULT_REFRESH_INTERVAL } = options || {};

  const [stocks, setStocks] = useState<Stock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * 주식 데이터 가져오기
   */
  const fetchStocks = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const results: Stock[] = [];

      // 순차적으로 API 호출 (rate limit 고려)
      for (let i = 0; i < KOREAN_STOCKS.length; i++) {
        const stock = KOREAN_STOCKS[i];

        try {
          const response = await fetch(`/api/kis/stock/price?symbol=${stock.symbol}`);
          const data: StockPriceData = await response.json();

          if (response.ok && data.currentPrice) {
            results.push({
              rank: i + 1,
              name: stock.name,
              ticker: stock.symbol,
              price: data.currentPrice,
              change: data.change,
              changePercent: data.changePercent,
              volume: formatVolume(data.volume),
              domain: stock.domain,
            });
          } else {
            console.warn(`[useKoreanStocks] ${stock.name} 조회 실패:`, data);
          }
        } catch (err) {
          console.error(`[useKoreanStocks] ${stock.name} API 에러:`, err);
        }

        // API 호출 간 딜레이 (100ms)
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      // 등락률로 정렬하여 순위 재할당
      results.sort((a, b) => b.changePercent - a.changePercent);
      results.forEach((stock, idx) => {
        stock.rank = idx + 1;
      });

      setStocks(results);

      if (results.length === 0) {
        setError('주식 데이터를 가져올 수 없습니다.');
      }
    } catch (err) {
      console.error('[useKoreanStocks] 전체 에러:', err);
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 초기 로드
  useEffect(() => {
    fetchStocks();
  }, [fetchStocks]);

  // 자동 새로고침
  useEffect(() => {
    if (!autoRefresh) return;

    const intervalId = setInterval(fetchStocks, refreshInterval);
    return () => clearInterval(intervalId);
  }, [autoRefresh, refreshInterval, fetchStocks]);

  return { stocks, isLoading, error, refetch: fetchStocks };
}

// ==================== 개별 종목 훅 ====================

interface UseKoreanStockPriceResult {
  stock: StockPriceData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * 개별 한국 종목 현재가 훅
 *
 * @param symbol 종목코드 (6자리)
 * @param autoRefresh 자동 새로고침 여부 (기본: false)
 * @returns 종목 데이터, 로딩 상태, 에러, refetch 함수
 *
 * @example
 * ```tsx
 * const { stock, isLoading, error, refetch } = useKoreanStockPrice('005930');
 * ```
 */
export function useKoreanStockPrice(
  symbol: string,
  options?: {
    autoRefresh?: boolean;
    refreshInterval?: number;
  }
): UseKoreanStockPriceResult {
  const { autoRefresh = false, refreshInterval = DEFAULT_REFRESH_INTERVAL } = options || {};

  const [stock, setStock] = useState<StockPriceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * 종목 데이터 가져오기
   */
  const fetchStock = useCallback(async () => {
    if (!symbol || !/^\d{6}$/.test(symbol)) {
      setError('유효하지 않은 종목코드입니다.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/kis/stock/price?symbol=${symbol}`);
      const data = await response.json();

      if (response.ok && data.currentPrice) {
        setStock(data);
      } else {
        setError(data.message || '종목 데이터를 가져올 수 없습니다.');
      }
    } catch (err) {
      console.error('[useKoreanStockPrice] 에러:', err);
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [symbol]);

  // 초기 로드
  useEffect(() => {
    fetchStock();
  }, [fetchStock]);

  // 자동 새로고침
  useEffect(() => {
    if (!autoRefresh) return;

    const intervalId = setInterval(fetchStock, refreshInterval);
    return () => clearInterval(intervalId);
  }, [autoRefresh, refreshInterval, fetchStock]);

  return { stock, isLoading, error, refetch: fetchStock };
}

// ==================== 개별 지수 훅 ====================

interface UseKoreanIndexPriceResult {
  index: IndexPriceData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * 개별 한국 지수 현재가 훅
 *
 * @param indexCode 지수코드 (0001: 코스피, 1001: 코스닥, 2001: 코스피200)
 * @param autoRefresh 자동 새로고침 여부 (기본: false)
 * @returns 지수 데이터, 로딩 상태, 에러, refetch 함수
 */
export function useKoreanIndexPrice(
  indexCode: string,
  options?: {
    autoRefresh?: boolean;
    refreshInterval?: number;
  }
): UseKoreanIndexPriceResult {
  const { autoRefresh = false, refreshInterval = DEFAULT_REFRESH_INTERVAL } = options || {};

  const [index, setIndex] = useState<IndexPriceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * 지수 데이터 가져오기
   */
  const fetchIndex = useCallback(async () => {
    if (!indexCode) {
      setError('유효하지 않은 지수코드입니다.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/kis/index/price?indexCode=${indexCode}`);
      const data = await response.json();

      if (response.ok && data.currentValue) {
        setIndex(data);
      } else {
        setError(data.message || '지수 데이터를 가져올 수 없습니다.');
      }
    } catch (err) {
      console.error('[useKoreanIndexPrice] 에러:', err);
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [indexCode]);

  // 초기 로드
  useEffect(() => {
    fetchIndex();
  }, [fetchIndex]);

  // 자동 새로고침
  useEffect(() => {
    if (!autoRefresh) return;

    const intervalId = setInterval(fetchIndex, refreshInterval);
    return () => clearInterval(intervalId);
  }, [autoRefresh, refreshInterval, fetchIndex]);

  return { index, isLoading, error, refetch: fetchIndex };
}

// ==================== 순위 조회 훅 ====================

/**
 * 거래량순위 데이터 훅
 *
 * @param market 시장구분 ('all' | 'kospi' | 'kosdaq')
 * @param autoRefresh 자동 새로고침 여부 (기본: false)
 * @param refreshInterval 새로고침 간격 (밀리초, 기본: 60초)
 * @returns 거래량순위 데이터 (최대 30건), 로딩 상태, 에러, refetch 함수
 *
 * @example
 * ```tsx
 * const { data, isLoading, error, refetch } = useVolumeRanking('all');
 * ```
 *
 * @see /api/kis/ranking/volume - API 엔드포인트
 */
interface UseVolumeRankingResult {
  data: VolumeRankingData[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useVolumeRanking(
  market: 'all' | 'kospi' | 'kosdaq' = 'all',
  options?: {
    autoRefresh?: boolean;
    refreshInterval?: number;
  }
): UseVolumeRankingResult {
  const { autoRefresh = false, refreshInterval = DEFAULT_REFRESH_INTERVAL } = options || {};

  const [data, setData] = useState<VolumeRankingData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * 거래량순위 데이터 가져오기
   */
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/kis/ranking/volume?market=${market}`);
      const result = await response.json();

      if (response.ok && Array.isArray(result)) {
        setData(result);
      } else {
        setError(result.message || '거래량순위 데이터를 가져올 수 없습니다.');
      }
    } catch (err) {
      console.error('[useVolumeRanking] 에러:', err);
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [market]);

  // 초기 로드
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 자동 새로고침
  useEffect(() => {
    if (!autoRefresh) return;

    const intervalId = setInterval(fetchData, refreshInterval);
    return () => clearInterval(intervalId);
  }, [autoRefresh, refreshInterval, fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}

/**
 * 등락률순위 데이터 훅
 *
 * @param market 시장구분 ('all' | 'kospi' | 'kosdaq')
 * @param sortOrder 정렬순서 ('asc': 상승률순, 'desc': 하락률순)
 * @param autoRefresh 자동 새로고침 여부 (기본: false)
 * @param refreshInterval 새로고침 간격 (밀리초, 기본: 60초)
 * @returns 등락률순위 데이터 (최대 30건), 로딩 상태, 에러, refetch 함수
 *
 * @example
 * ```tsx
 * // 상승 TOP
 * const { data: gainers } = useFluctuationRanking('all', 'asc');
 * // 하락 TOP
 * const { data: losers } = useFluctuationRanking('all', 'desc');
 * ```
 *
 * @see /api/kis/ranking/fluctuation - API 엔드포인트
 */
interface UseFluctuationRankingResult {
  data: FluctuationRankingData[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useFluctuationRanking(
  market: 'all' | 'kospi' | 'kosdaq' = 'all',
  sortOrder: 'asc' | 'desc' = 'asc',
  options?: {
    autoRefresh?: boolean;
    refreshInterval?: number;
  }
): UseFluctuationRankingResult {
  const { autoRefresh = false, refreshInterval = DEFAULT_REFRESH_INTERVAL } = options || {};

  const [data, setData] = useState<FluctuationRankingData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * 등락률순위 데이터 가져오기
   */
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/kis/ranking/fluctuation?market=${market}&sort=${sortOrder}`);
      const result = await response.json();

      if (response.ok && Array.isArray(result)) {
        setData(result);
      } else {
        setError(result.message || '등락률순위 데이터를 가져올 수 없습니다.');
      }
    } catch (err) {
      console.error('[useFluctuationRanking] 에러:', err);
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [market, sortOrder]);

  // 초기 로드
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 자동 새로고침
  useEffect(() => {
    if (!autoRefresh) return;

    const intervalId = setInterval(fetchData, refreshInterval);
    return () => clearInterval(intervalId);
  }, [autoRefresh, refreshInterval, fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}

/**
 * 시가총액순위 데이터 훅
 *
 * @param market 시장구분 ('all' | 'kospi' | 'kosdaq')
 * @param autoRefresh 자동 새로고침 여부 (기본: false)
 * @param refreshInterval 새로고침 간격 (밀리초, 기본: 60초)
 * @returns 시가총액순위 데이터 (최대 30건), 로딩 상태, 에러, refetch 함수
 *
 * @example
 * ```tsx
 * const { data, isLoading, error, refetch } = useMarketCapRanking('all');
 * ```
 *
 * @see /api/kis/ranking/market-cap - API 엔드포인트
 */
interface UseMarketCapRankingResult {
  data: MarketCapRankingData[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useMarketCapRanking(
  market: 'all' | 'kospi' | 'kosdaq' = 'all',
  options?: {
    autoRefresh?: boolean;
    refreshInterval?: number;
  }
): UseMarketCapRankingResult {
  const { autoRefresh = false, refreshInterval = DEFAULT_REFRESH_INTERVAL } = options || {};

  const [data, setData] = useState<MarketCapRankingData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * 시가총액순위 데이터 가져오기
   */
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/kis/ranking/market-cap?market=${market}`);
      const result = await response.json();

      if (response.ok && Array.isArray(result)) {
        setData(result);
      } else {
        setError(result.message || '시가총액순위 데이터를 가져올 수 없습니다.');
      }
    } catch (err) {
      console.error('[useMarketCapRanking] 에러:', err);
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [market]);

  // 초기 로드
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 자동 새로고침
  useEffect(() => {
    if (!autoRefresh) return;

    const intervalId = setInterval(fetchData, refreshInterval);
    return () => clearInterval(intervalId);
  }, [autoRefresh, refreshInterval, fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}

// ==================== 한국 ETF 훅 ====================

import type { KoreanETFInfo } from '@/constants';

/**
 * ETF 시세 데이터 타입 (API 응답)
 *
 * StockPriceData를 기반으로 ETF 정보를 추가
 */
export interface ETFPriceData extends StockPriceData {
  /** ETF 이름 (한글) */
  name: string;
  /** ETF 카테고리 */
  category: KoreanETFInfo['category'];
  /** 운용사 */
  issuer: string;
}

/**
 * ETF API 응답 타입
 */
interface ETFPricesApiResponse {
  /** 조회 성공한 ETF 목록 */
  data: ETFPriceData[];
  /** 조회 실패한 ETF 목록 (종목코드) */
  failed: string[];
  /** 조회 시각 */
  timestamp: string;
  /** 조회한 카테고리 */
  category: string;
}

interface UseKoreanETFsResult {
  /** ETF 시세 데이터 배열 */
  etfs: ETFPriceData[];
  /** 로딩 상태 */
  isLoading: boolean;
  /** 에러 메시지 */
  error: string | null;
  /** 수동 새로고침 함수 */
  refetch: () => Promise<void>;
  /** 조회 실패한 종목코드 목록 */
  failedSymbols: string[];
}

/**
 * 한국 ETF 시세 데이터 훅
 *
 * 한국투자증권 API를 통해 ETF 시세를 조회합니다.
 * 카테고리별 필터링이 가능합니다.
 *
 * @param category ETF 카테고리 ('all' | 'index' | 'leverage' | 'sector' | 'overseas' | 'bond')
 * @param options 옵션 (autoRefresh, refreshInterval)
 * @returns ETF 시세 데이터, 로딩 상태, 에러, refetch 함수, 실패 종목
 *
 * @example
 * ```tsx
 * // 전체 ETF 조회
 * const { etfs, isLoading, error, refetch } = useKoreanETFs();
 *
 * // 해외지수 ETF만 조회
 * const { etfs, isLoading } = useKoreanETFs('overseas');
 *
 * // 자동 새로고침 활성화
 * const { etfs } = useKoreanETFs('all', { autoRefresh: true, refreshInterval: 60000 });
 * ```
 *
 * @see /api/kis/etf/prices - API 엔드포인트
 */
export function useKoreanETFs(
  category: 'all' | 'index' | 'leverage' | 'sector' | 'overseas' | 'bond' = 'all',
  options?: {
    autoRefresh?: boolean;
    refreshInterval?: number;
  }
): UseKoreanETFsResult {
  const { autoRefresh = false, refreshInterval = DEFAULT_REFRESH_INTERVAL } = options || {};

  const [etfs, setEtfs] = useState<ETFPriceData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [failedSymbols, setFailedSymbols] = useState<string[]>([]);

  /**
   * ETF 데이터 가져오기
   */
  const fetchETFs = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // ETF 시세 배치 조회 API 호출
      const response = await fetch(`/api/kis/etf/prices?category=${category}`);
      const result: ETFPricesApiResponse = await response.json();

      if (response.ok && result.data) {
        setEtfs(result.data);
        setFailedSymbols(result.failed || []);

        // 모든 ETF 조회 실패 시 에러 표시
        if (result.data.length === 0) {
          setError('ETF 시세 데이터를 가져올 수 없습니다.');
        }
      } else {
        // API 에러 응답
        const errorResponse = result as unknown as { message?: string };
        setError(errorResponse.message || 'ETF 시세 데이터를 가져올 수 없습니다.');
      }
    } catch (err) {
      console.error('[useKoreanETFs] 에러:', err);
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [category]);

  // 초기 로드
  useEffect(() => {
    fetchETFs();
  }, [fetchETFs]);

  // 자동 새로고침
  useEffect(() => {
    if (!autoRefresh) return;

    const intervalId = setInterval(fetchETFs, refreshInterval);
    return () => clearInterval(intervalId);
  }, [autoRefresh, refreshInterval, fetchETFs]);

  return { etfs, isLoading, error, refetch: fetchETFs, failedSymbols };
}

// ==================== 미국 시장 훅 ====================

import type {
  OverseasIndexData,
  OverseasVolumeRankingData,
  OverseasFluctuationRankingData,
  OverseasMarketCapRankingData,
  OverseasStockPriceData,
  OverseasExchangeCode,
} from '@/types/kis';
import type { USETFInfo, USStockInfo } from '@/constants';

/**
 * 미국 지수 데이터 훅
 *
 * @param autoRefresh 자동 새로고침 여부 (기본: false)
 * @param refreshInterval 새로고침 간격 (밀리초, 기본: 60초)
 * @returns 지수 데이터 (S&P500, NASDAQ, DOW JONES), 로딩 상태, 에러, refetch 함수
 *
 * @example
 * ```tsx
 * const { indices, isLoading, error, refetch } = useUSIndices({ autoRefresh: true });
 * ```
 *
 * @see /api/kis/overseas/indices - API 엔드포인트
 */
interface UseUSIndicesResult {
  indices: OverseasIndexData[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  failedIndices: string[];
}

export function useUSIndices(options?: {
  autoRefresh?: boolean;
  refreshInterval?: number;
}): UseUSIndicesResult {
  const { autoRefresh = false, refreshInterval = DEFAULT_REFRESH_INTERVAL } = options || {};

  const [indices, setIndices] = useState<OverseasIndexData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [failedIndices, setFailedIndices] = useState<string[]>([]);

  const fetchIndices = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/kis/overseas/indices');
      const result = await response.json();

      if (response.ok && result.data) {
        setIndices(result.data);
        setFailedIndices(result.failed || []);

        if (result.data.length === 0) {
          setError('미국 지수 데이터를 가져올 수 없습니다.');
        }
      } else {
        setError(result.message || '미국 지수 데이터를 가져올 수 없습니다.');
      }
    } catch (err) {
      console.error('[useUSIndices] 에러:', err);
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIndices();
  }, [fetchIndices]);

  useEffect(() => {
    if (!autoRefresh) return;
    const intervalId = setInterval(fetchIndices, refreshInterval);
    return () => clearInterval(intervalId);
  }, [autoRefresh, refreshInterval, fetchIndices]);

  return { indices, isLoading, error, refetch: fetchIndices, failedIndices };
}

/**
 * 미국 주식 거래량순위 데이터 훅
 *
 * @param exchange 거래소 코드 (NAS: 나스닥, NYS: 뉴욕, AMS: 아멕스)
 * @param options 옵션
 * @returns 거래량순위 데이터, 로딩 상태, 에러, refetch 함수
 *
 * @see /api/kis/overseas/ranking/volume - API 엔드포인트
 */
interface UseUSVolumeRankingResult {
  data: OverseasVolumeRankingData[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useUSVolumeRanking(
  exchange: OverseasExchangeCode = 'NAS',
  options?: {
    autoRefresh?: boolean;
    refreshInterval?: number;
  }
): UseUSVolumeRankingResult {
  const { autoRefresh = false, refreshInterval = DEFAULT_REFRESH_INTERVAL } = options || {};

  const [data, setData] = useState<OverseasVolumeRankingData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/kis/overseas/ranking/volume?exchange=${exchange}`);
      const result = await response.json();

      if (response.ok && result.data) {
        setData(result.data);
      } else {
        setError(result.message || '거래량순위 데이터를 가져올 수 없습니다.');
      }
    } catch (err) {
      console.error('[useUSVolumeRanking] 에러:', err);
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [exchange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!autoRefresh) return;
    const intervalId = setInterval(fetchData, refreshInterval);
    return () => clearInterval(intervalId);
  }, [autoRefresh, refreshInterval, fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}

/**
 * 미국 주식 등락률순위 데이터 훅
 *
 * @param exchange 거래소 코드 (NAS: 나스닥, NYS: 뉴욕)
 * @param sortOrder 정렬순서 ('asc': 상승률순, 'desc': 하락률순)
 * @param options 옵션
 * @returns 등락률순위 데이터, 로딩 상태, 에러, refetch 함수
 *
 * @see /api/kis/overseas/ranking/fluctuation - API 엔드포인트
 */
interface UseUSFluctuationRankingResult {
  data: OverseasFluctuationRankingData[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useUSFluctuationRanking(
  exchange: OverseasExchangeCode = 'NAS',
  sortOrder: 'asc' | 'desc' = 'asc',
  options?: {
    autoRefresh?: boolean;
    refreshInterval?: number;
  }
): UseUSFluctuationRankingResult {
  const { autoRefresh = false, refreshInterval = DEFAULT_REFRESH_INTERVAL } = options || {};

  const [data, setData] = useState<OverseasFluctuationRankingData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/kis/overseas/ranking/fluctuation?exchange=${exchange}&sort=${sortOrder}`);
      const result = await response.json();

      if (response.ok && result.data) {
        setData(result.data);
      } else {
        setError(result.message || '등락률순위 데이터를 가져올 수 없습니다.');
      }
    } catch (err) {
      console.error('[useUSFluctuationRanking] 에러:', err);
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [exchange, sortOrder]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!autoRefresh) return;
    const intervalId = setInterval(fetchData, refreshInterval);
    return () => clearInterval(intervalId);
  }, [autoRefresh, refreshInterval, fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}

/**
 * 미국 주식 시가총액순위 데이터 훅
 *
 * @param exchange 거래소 코드 (NAS: 나스닥, NYS: 뉴욕)
 * @param options 옵션
 * @returns 시가총액순위 데이터, 로딩 상태, 에러, refetch 함수
 *
 * @see /api/kis/overseas/ranking/market-cap - API 엔드포인트
 */
interface UseUSMarketCapRankingResult {
  data: OverseasMarketCapRankingData[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useUSMarketCapRanking(
  exchange: OverseasExchangeCode = 'NAS',
  options?: {
    autoRefresh?: boolean;
    refreshInterval?: number;
  }
): UseUSMarketCapRankingResult {
  const { autoRefresh = false, refreshInterval = DEFAULT_REFRESH_INTERVAL } = options || {};

  const [data, setData] = useState<OverseasMarketCapRankingData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/kis/overseas/ranking/market-cap?exchange=${exchange}`);
      const result = await response.json();

      if (response.ok && result.data) {
        setData(result.data);
      } else {
        setError(result.message || '시가총액순위 데이터를 가져올 수 없습니다.');
      }
    } catch (err) {
      console.error('[useUSMarketCapRanking] 에러:', err);
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [exchange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!autoRefresh) return;
    const intervalId = setInterval(fetchData, refreshInterval);
    return () => clearInterval(intervalId);
  }, [autoRefresh, refreshInterval, fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}

/**
 * 미국 ETF 시세 데이터 타입
 */
export interface USETFPriceData extends OverseasStockPriceData {
  name: string;
  category: USETFInfo['category'];
  issuer: string;
}

/**
 * 미국 ETF 시세 데이터 훅
 *
 * @param category ETF 카테고리 ('all' | 'index' | 'sector' | 'bond' | 'commodity' | 'international')
 * @param options 옵션
 * @returns ETF 시세 데이터, 로딩 상태, 에러, refetch 함수, 실패 종목
 *
 * @see /api/kis/overseas/etf/prices - API 엔드포인트
 */
interface UseUSETFsResult {
  etfs: USETFPriceData[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  failedSymbols: string[];
}

export function useUSETFs(
  category: 'all' | 'index' | 'sector' | 'leveraged' | 'bond' | 'commodity' | 'international' = 'all',
  options?: {
    autoRefresh?: boolean;
    refreshInterval?: number;
  }
): UseUSETFsResult {
  const { autoRefresh = false, refreshInterval = DEFAULT_REFRESH_INTERVAL } = options || {};

  const [etfs, setEtfs] = useState<USETFPriceData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [failedSymbols, setFailedSymbols] = useState<string[]>([]);

  const fetchETFs = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/kis/overseas/etf/prices?category=${category}`);
      const result = await response.json();

      if (response.ok && result.data) {
        setEtfs(result.data);
        setFailedSymbols(result.failed || []);

        if (result.data.length === 0) {
          setError('미국 ETF 시세 데이터를 가져올 수 없습니다.');
        }
      } else {
        setError(result.message || '미국 ETF 시세 데이터를 가져올 수 없습니다.');
      }
    } catch (err) {
      console.error('[useUSETFs] 에러:', err);
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [category]);

  useEffect(() => {
    fetchETFs();
  }, [fetchETFs]);

  useEffect(() => {
    if (!autoRefresh) return;
    const intervalId = setInterval(fetchETFs, refreshInterval);
    return () => clearInterval(intervalId);
  }, [autoRefresh, refreshInterval, fetchETFs]);

  return { etfs, isLoading, error, refetch: fetchETFs, failedSymbols };
}

// ==================== 미국 주식 시세 훅 ====================

/**
 * 미국 주식 시세 데이터 타입
 */
export interface USStockPriceData extends OverseasStockPriceData {
  name: string;
  sector: USStockInfo['sector'];
}

/**
 * 미국 주식 시세 데이터 훅
 *
 * @param sector 섹터 필터 ('all' | 'tech' | 'finance' | 'healthcare' | ...)
 * @param options 옵션
 * @returns 주식 시세 데이터, 로딩 상태, 에러, refetch 함수, 실패 종목
 *
 * @description
 * 해외주식 시가총액순위 API가 빈 배열을 반환하는 경우의 폴백입니다.
 * 시가총액 상위 50개 종목의 개별 시세를 조회합니다.
 *
 * @see /api/kis/overseas/stock/prices - API 엔드포인트
 */
interface UseUSStocksResult {
  stocks: USStockPriceData[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  failedSymbols: string[];
}

export function useUSStocks(
  sector: 'all' | 'tech' | 'finance' | 'healthcare' | 'consumer' | 'energy' | 'industrial' | 'telecom' = 'all',
  options?: {
    autoRefresh?: boolean;
    refreshInterval?: number;
  }
): UseUSStocksResult {
  const { autoRefresh = false, refreshInterval = DEFAULT_REFRESH_INTERVAL } = options || {};

  const [stocks, setStocks] = useState<USStockPriceData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [failedSymbols, setFailedSymbols] = useState<string[]>([]);

  const fetchStocks = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/kis/overseas/stock/prices?sector=${sector}`);
      const result = await response.json();

      if (response.ok && result.data) {
        setStocks(result.data);
        setFailedSymbols(result.failed || []);

        if (result.data.length === 0) {
          setError('미국 주식 시세 데이터를 가져올 수 없습니다.');
        }
      } else {
        setError(result.message || '미국 주식 시세 데이터를 가져올 수 없습니다.');
      }
    } catch (err) {
      console.error('[useUSStocks] 에러:', err);
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [sector]);

  useEffect(() => {
    fetchStocks();
  }, [fetchStocks]);

  useEffect(() => {
    if (!autoRefresh) return;
    const intervalId = setInterval(fetchStocks, refreshInterval);
    return () => clearInterval(intervalId);
  }, [autoRefresh, refreshInterval, fetchStocks]);

  return { stocks, isLoading, error, refetch: fetchStocks, failedSymbols };
}

// ==================== 미국 주식 개별 시세 훅 ====================

/**
 * 미국 주식 개별 시세 응답 타입
 *
 * API 응답에서 받는 데이터 형식입니다.
 */
export interface USStockPriceResponse {
  /** 종목 심볼 (예: AAPL, TSLA) */
  symbol: string;
  /** 회사명 */
  name: string;
  /** 거래소 코드 (NAS, NYS, AMS) */
  exchange: string;
  /** 현재가 (USD) */
  currentPrice: number;
  /** 전일 대비 변동폭 */
  change: number;
  /** 전일 대비 변동률 (%) */
  changePercent: number;
  /** 거래량 */
  volume: number;
  /** 조회 시각 */
  timestamp: string;
}

interface UseUSStockPriceResult {
  /** 종목 시세 데이터 */
  stock: USStockPriceResponse | null;
  /** 로딩 상태 */
  isLoading: boolean;
  /** 에러 메시지 */
  error: string | null;
  /** 수동 새로고침 함수 */
  refetch: () => Promise<void>;
}

/**
 * 미국 주식 개별 시세 조회 훅
 *
 * 한국투자증권 API를 통해 미국 개별 주식의 현재가를 조회합니다.
 *
 * @param symbol 종목 심볼 (예: AAPL, TSLA, MSFT)
 * @param options 옵션 (autoRefresh, refreshInterval)
 * @returns 종목 시세 데이터, 로딩 상태, 에러, refetch 함수
 *
 * @example
 * ```tsx
 * // AAPL 현재가 조회
 * const { stock, isLoading, error, refetch } = useUSStockPrice('AAPL');
 *
 * // 자동 새로고침 활성화 (1분 간격)
 * const { stock } = useUSStockPrice('TSLA', { autoRefresh: true });
 * ```
 *
 * @see /api/kis/overseas/stock/price - API 엔드포인트
 */
export function useUSStockPrice(
  symbol: string,
  options?: {
    autoRefresh?: boolean;
    refreshInterval?: number;
  }
): UseUSStockPriceResult {
  const { autoRefresh = false, refreshInterval = DEFAULT_REFRESH_INTERVAL } = options || {};

  const [stock, setStock] = useState<USStockPriceResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * 종목 시세 데이터 가져오기
   */
  const fetchStock = useCallback(async () => {
    // 심볼이 없으면 에러
    if (!symbol) {
      setError('종목 심볼이 필요합니다.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 미국 주식 개별 시세 API 호출
      const response = await fetch(`/api/kis/overseas/stock/price?symbol=${symbol.toUpperCase()}`);
      const result = await response.json();

      if (response.ok && result.currentPrice !== undefined) {
        // 성공: 시세 데이터 설정
        setStock(result);
      } else {
        // 실패: 에러 메시지 설정
        setError(result.message || '종목 데이터를 가져올 수 없습니다.');
      }
    } catch (err) {
      // 네트워크 에러 등
      console.error('[useUSStockPrice] 에러:', err);
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [symbol]);

  // 초기 로드 (심볼 변경 시 재조회)
  useEffect(() => {
    fetchStock();
  }, [fetchStock]);

  // 자동 새로고침 (옵션 활성화 시)
  useEffect(() => {
    if (!autoRefresh) return;

    const intervalId = setInterval(fetchStock, refreshInterval);
    return () => clearInterval(intervalId);
  }, [autoRefresh, refreshInterval, fetchStock]);

  return { stock, isLoading, error, refetch: fetchStock };
}
