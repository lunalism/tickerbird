/**
 * 인기 검색어 조회 훅
 *
 * @description
 * /api/search/popular API를 호출하여 인기 검색어를 가져옵니다.
 * SWR 패턴으로 캐싱 및 재검증을 지원합니다.
 *
 * @example
 * ```tsx
 * const { popularSearches, isLoading, error, refetch } = usePopularSearches();
 *
 * return (
 *   <div>
 *     {popularSearches.map((item) => (
 *       <button key={item.query}>{item.query}</button>
 *     ))}
 *   </div>
 * );
 * ```
 */

'use client';

import { useState, useEffect, useCallback } from 'react';

// ==================== 타입 정의 ====================

/**
 * 인기 검색어 항목
 */
export interface PopularSearchItem {
  /** 검색어 */
  query: string;
  /** 검색 횟수 */
  count: number;
}

/**
 * API 응답 타입
 */
interface PopularSearchesResponse {
  success: boolean;
  searches: PopularSearchItem[];
  cached: boolean;
  count: number;
  timestamp: string;
  error?: string;
}

/**
 * 훅 반환 타입
 */
interface UsePopularSearchesResult {
  /** 인기 검색어 목록 */
  popularSearches: PopularSearchItem[];
  /** 로딩 상태 */
  isLoading: boolean;
  /** 에러 메시지 */
  error: string | null;
  /** 캐시 사용 여부 */
  isCached: boolean;
  /** 수동 새로고침 */
  refetch: (forceRefresh?: boolean) => Promise<void>;
}

// ==================== 상수 ====================

/** 기본 인기 검색어 (로딩 중 또는 에러 시) */
const DEFAULT_SEARCHES: PopularSearchItem[] = [
  { query: '삼성전자', count: 0 },
  { query: 'NVIDIA', count: 0 },
  { query: '테슬라', count: 0 },
  { query: 'CPI', count: 0 },
  { query: 'FOMC', count: 0 },
  { query: '금리', count: 0 },
];

/** 클라이언트 캐시 유효 시간 (5분) */
const CLIENT_CACHE_TTL_MS = 5 * 60 * 1000;

// ==================== 클라이언트 캐시 ====================

let cachedData: PopularSearchItem[] | null = null;
let cacheTimestamp: number = 0;

// ==================== 훅 구현 ====================

/**
 * 인기 검색어 조회 훅
 */
export function usePopularSearches(): UsePopularSearchesResult {
  const [popularSearches, setPopularSearches] = useState<PopularSearchItem[]>(DEFAULT_SEARCHES);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCached, setIsCached] = useState(false);

  /**
   * API 호출 함수
   */
  const fetchPopularSearches = useCallback(async (forceRefresh = false) => {
    // 클라이언트 캐시 확인 (강제 새로고침이 아닌 경우)
    if (!forceRefresh && cachedData && Date.now() - cacheTimestamp < CLIENT_CACHE_TTL_MS) {
      console.log('[usePopularSearches] 클라이언트 캐시 사용');
      setPopularSearches(cachedData);
      setIsCached(true);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const url = forceRefresh
        ? '/api/search/popular?refresh=true'
        : '/api/search/popular';

      const response = await fetch(url);
      const data: PopularSearchesResponse = await response.json();

      if (data.success && data.searches.length > 0) {
        setPopularSearches(data.searches);
        setIsCached(data.cached);

        // 클라이언트 캐시 업데이트
        cachedData = data.searches;
        cacheTimestamp = Date.now();
      } else {
        // 실패 시 기본값 유지
        setError(data.error || '인기 검색어를 가져오는데 실패했습니다.');
      }
    } catch (err) {
      console.error('[usePopularSearches] 에러:', err);
      setError(err instanceof Error ? err.message : '알 수 없는 오류');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    fetchPopularSearches();
  }, [fetchPopularSearches]);

  return {
    popularSearches,
    isLoading,
    error,
    isCached,
    refetch: fetchPopularSearches,
  };
}

export default usePopularSearches;
