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
import type { StockPriceData, IndexPriceData } from '@/types/kis';
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
