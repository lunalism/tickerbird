/**
 * 종목 검색 훅
 *
 * /api/search API를 사용하여 전체 종목에서 검색합니다.
 * debounce가 적용되어 타이핑 중에는 API 호출이 지연됩니다.
 *
 * 사용법:
 * const { results, isLoading, error, search } = useStockSearch();
 *
 * // 검색 실행
 * search('삼성');
 *
 * // 또는 옵션과 함께
 * search('AAPL', { market: 'us', limit: 10 });
 */

"use client";

import { useState, useCallback, useRef, useEffect } from 'react';

// ==================== 타입 정의 ====================

/**
 * 검색 결과 아이템 (한국 종목)
 */
export interface KoreanSearchResult {
  type: 'kr';
  symbol: string;
  name: string;
  market: 'KOSPI' | 'KOSDAQ';
}

/**
 * 검색 결과 아이템 (미국 종목)
 */
export interface USSearchResult {
  type: 'us';
  symbol: string;
  name: string;
  exchange: 'NASDAQ' | 'NYSE' | 'AMEX';
}

/**
 * 통합 검색 결과
 */
export type StockSearchResult = KoreanSearchResult | USSearchResult;

/**
 * 검색 옵션
 */
export interface SearchOptions {
  /** 시장 구분 ('all' | 'kr' | 'us') */
  market?: 'all' | 'kr' | 'us';
  /** 최대 결과 개수 */
  limit?: number;
}

/**
 * 훅 반환 타입
 */
export interface UseStockSearchReturn {
  /** 검색 결과 */
  results: StockSearchResult[];
  /** 로딩 상태 */
  isLoading: boolean;
  /** 에러 메시지 */
  error: string | null;
  /** 검색 실행 함수 */
  search: (query: string, options?: SearchOptions) => void;
  /** 검색 결과 초기화 */
  clear: () => void;
}

// ==================== 상수 ====================

/** debounce 시간 (ms) */
const DEBOUNCE_DELAY = 300;

/** 기본 검색 옵션 */
const DEFAULT_OPTIONS: SearchOptions = {
  market: 'all',
  limit: 50,
};

// ==================== 훅 구현 ====================

/**
 * 종목 검색 훅
 *
 * @returns 검색 상태 및 함수
 */
export function useStockSearch(): UseStockSearchReturn {
  // 검색 결과 상태
  const [results, setResults] = useState<StockSearchResult[]>([]);

  // 로딩 상태
  const [isLoading, setIsLoading] = useState(false);

  // 에러 상태
  const [error, setError] = useState<string | null>(null);

  // debounce 타이머 ref
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // AbortController ref (진행 중인 요청 취소용)
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * 검색 API 호출
   *
   * @param query 검색어
   * @param options 검색 옵션
   */
  const fetchSearch = useCallback(
    async (query: string, options: SearchOptions = DEFAULT_OPTIONS) => {
      // 빈 검색어 처리
      if (!query.trim()) {
        setResults([]);
        setIsLoading(false);
        setError(null);
        return;
      }

      // 이전 요청 취소
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // 새 AbortController 생성
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      setIsLoading(true);
      setError(null);

      try {
        // URL 파라미터 생성
        const params = new URLSearchParams({
          q: query.trim(),
          market: options.market || 'all',
          limit: String(options.limit || 50),
        });

        // API 호출
        const response = await fetch(`/api/search?${params.toString()}`, {
          signal: abortController.signal,
        });

        // 응답 확인
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || '검색에 실패했습니다.');
        }

        const data = await response.json();

        // 성공 처리
        if (data.success) {
          setResults(data.results || []);
        } else {
          throw new Error(data.message || '검색에 실패했습니다.');
        }
      } catch (err) {
        // 취소된 요청은 무시
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }

        console.error('[useStockSearch] 검색 에러:', err);
        setError(err instanceof Error ? err.message : '검색에 실패했습니다.');
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * 검색 실행 (debounced)
   *
   * @param query 검색어
   * @param options 검색 옵션
   */
  const search = useCallback(
    (query: string, options?: SearchOptions) => {
      // 이전 타이머 취소
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      // 빈 검색어는 즉시 처리
      if (!query.trim()) {
        setResults([]);
        setIsLoading(false);
        setError(null);
        return;
      }

      // 로딩 상태 즉시 표시
      setIsLoading(true);

      // debounce 적용
      debounceRef.current = setTimeout(() => {
        fetchSearch(query, { ...DEFAULT_OPTIONS, ...options });
      }, DEBOUNCE_DELAY);
    },
    [fetchSearch]
  );

  /**
   * 검색 결과 초기화
   */
  const clear = useCallback(() => {
    // 타이머 취소
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // 진행 중인 요청 취소
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setResults([]);
    setIsLoading(false);
    setError(null);
  }, []);

  /**
   * 컴포넌트 언마운트 시 정리
   */
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    results,
    isLoading,
    error,
    search,
    clear,
  };
}
