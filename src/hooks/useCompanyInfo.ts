/**
 * 회사 정보 조회 훅
 *
 * @description
 * Claude API로 생성된 회사 소개를 조회합니다.
 * Firestore 캐시를 활용하여 API 비용을 절감합니다.
 *
 * @example
 * ```tsx
 * const { description, isLoading, error } = useCompanyInfo('AAPL', '애플');
 * ```
 */

'use client';

import { useState, useEffect, useCallback } from 'react';

// ==================== 타입 정의 ====================

/**
 * API 응답 타입
 */
interface CompanyInfoResponse {
  symbol: string;
  name: string;
  description: string;
  cached: boolean;
}

/**
 * 훅 반환 타입
 */
interface UseCompanyInfoResult {
  /** 회사 소개 (AI 생성) */
  description: string | null;
  /** 로딩 상태 */
  isLoading: boolean;
  /** 에러 메시지 */
  error: string | null;
  /** 캐시 여부 */
  cached: boolean;
  /** 수동 새로고침 */
  refetch: () => Promise<void>;
}

/**
 * 회사 정보 조회 훅
 *
 * @param symbol 종목 심볼 (예: AAPL, TSLA)
 * @param name 회사명 (한글명 우선)
 * @param enabled 활성화 여부 (기본: true)
 * @returns 회사 소개 정보
 */
export function useCompanyInfo(
  symbol: string | undefined,
  name?: string,
  enabled: boolean = true
): UseCompanyInfoResult {
  const [description, setDescription] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cached, setCached] = useState(false);

  /**
   * 회사 정보 가져오기
   */
  const fetchCompanyInfo = useCallback(async () => {
    // 심볼이 없거나 비활성화된 경우 스킵
    if (!symbol || !enabled) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // API 호출 (회사명 포함)
      const queryParams = new URLSearchParams({ symbol });
      if (name) {
        queryParams.append('name', name);
      }

      const response = await fetch(`/api/company-info?${queryParams}`);
      const data = await response.json();

      if (response.ok) {
        setDescription(data.description);
        setCached(data.cached);
      } else {
        // 에러 응답
        setError(data.message || '회사 정보를 가져올 수 없습니다.');
      }
    } catch (err) {
      console.error('[useCompanyInfo] 에러:', err);
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [symbol, name, enabled]);

  // 초기 로드 및 심볼 변경 시 재조회
  useEffect(() => {
    fetchCompanyInfo();
  }, [fetchCompanyInfo]);

  return {
    description,
    isLoading,
    error,
    cached,
    refetch: fetchCompanyInfo,
  };
}
