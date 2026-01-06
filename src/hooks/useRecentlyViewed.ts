'use client';

/**
 * useRecentlyViewed 커스텀 훅
 *
 * @description
 * localStorage 기반 최근 본 종목 관리 훅입니다.
 * - 최근 본 종목 추가/제거/조회 기능 제공
 * - 여러 컴포넌트에서 재사용 가능
 * - SSR 호환 (클라이언트에서만 localStorage 접근)
 *
 * @features
 * - 최대 20개 저장 (초과 시 오래된 항목 자동 삭제)
 * - 같은 종목 재방문 시 최신으로 갱신 (맨 앞으로 이동)
 * - 상태 자동 동기화
 *
 * @extension
 * 추후 로그인 기능 완성 시:
 * - 로그인 상태 체크 → DB에서 데이터 조회/저장
 * - 비로그인 상태 → 현재처럼 localStorage 사용
 * - 로그인 시 localStorage → DB 마이그레이션
 *
 * @usage
 * ```tsx
 * const {
 *   recentlyViewed,
 *   addToRecentlyViewed,
 *   removeFromRecentlyViewed,
 *   clearRecentlyViewed,
 * } = useRecentlyViewed();
 *
 * // 종목 추가 (페이지 방문 시)
 * addToRecentlyViewed({ ticker: 'AAPL', market: 'us', name: 'Apple Inc.' });
 *
 * // 종목 제거
 * removeFromRecentlyViewed('AAPL');
 *
 * // 목록 표시
 * {recentlyViewed.map(stock => (
 *   <div key={stock.ticker}>{stock.name}</div>
 * ))}
 * ```
 *
 * @localStorage
 * 키: "recentlyViewed"
 * 형식: RecentlyViewedStock[]
 */

import { useState, useEffect, useCallback } from 'react';
import {
  RecentlyViewedStock,
  UseRecentlyViewedReturn,
} from '@/types/recentlyViewed';
import {
  getRecentlyViewed,
  addRecentlyViewed as addToStorage,
  removeRecentlyViewed as removeFromStorage,
  clearRecentlyViewed as clearStorage,
} from '@/lib/recentlyViewed';

// ==================== 훅 ====================

/**
 * 최근 본 종목 관리 훅
 *
 * @returns 최근 본 종목 상태 및 관리 함수
 */
export function useRecentlyViewed(): UseRecentlyViewedReturn {
  // ========================================
  // 상태 정의
  // ========================================

  /**
   * 최근 본 종목 목록
   * 초기값은 빈 배열, 클라이언트 마운트 시 localStorage에서 로드
   */
  const [recentlyViewed, setRecentlyViewed] = useState<RecentlyViewedStock[]>([]);

  /**
   * 로딩 상태
   * 초기 로드 완료 여부 (SSR 하이드레이션 처리용)
   */
  const [isLoaded, setIsLoaded] = useState(false);

  // ========================================
  // 초기 로드: 클라이언트 마운트 시 localStorage에서 불러오기
  // ========================================
  useEffect(() => {
    // localStorage에서 데이터 로드
    const stored = getRecentlyViewed();
    setRecentlyViewed(stored);
    setIsLoaded(true);

    console.log(`[useRecentlyViewed] 초기 로드 완료: ${stored.length}개 항목`);
  }, []);

  // ========================================
  // 최근 본 종목 추가
  // ========================================

  /**
   * 종목 추가 함수
   *
   * @description
   * 종목을 최근 본 목록에 추가합니다.
   * 이미 존재하는 종목은 시간만 갱신되어 맨 앞으로 이동합니다.
   *
   * @param stock 추가할 종목 정보 (viewedAt 제외)
   */
  const addToRecentlyViewed = useCallback(
    (stock: Omit<RecentlyViewedStock, 'viewedAt'>) => {
      // localStorage에 저장 및 업데이트된 목록 받기
      const updated = addToStorage(stock);

      // 상태 업데이트
      setRecentlyViewed(updated);
    },
    []
  );

  // ========================================
  // 최근 본 종목 제거
  // ========================================

  /**
   * 종목 제거 함수
   *
   * @description
   * ticker를 기준으로 특정 종목을 목록에서 제거합니다.
   *
   * @param ticker 제거할 종목의 티커
   */
  const removeFromRecentlyViewed = useCallback((ticker: string) => {
    // localStorage에서 제거 및 업데이트된 목록 받기
    const updated = removeFromStorage(ticker);

    // 상태 업데이트
    setRecentlyViewed(updated);
  }, []);

  // ========================================
  // 전체 삭제
  // ========================================

  /**
   * 전체 삭제 함수
   *
   * @description
   * 최근 본 종목 목록을 모두 삭제합니다.
   */
  const clearRecentlyViewed = useCallback(() => {
    // localStorage 삭제
    clearStorage();

    // 상태 초기화
    setRecentlyViewed([]);

    console.log('[useRecentlyViewed] 전체 삭제 완료');
  }, []);

  // ========================================
  // 반환값
  // ========================================

  return {
    /** 최근 본 종목 목록 (최신순 정렬) */
    recentlyViewed,

    /** 초기 로드 완료 여부 */
    isLoaded,

    /** 종목 추가 (중복 시 최신으로 갱신) */
    addToRecentlyViewed,

    /** 종목 제거 */
    removeFromRecentlyViewed,

    /** 전체 삭제 */
    clearRecentlyViewed,

    /** 최근 본 종목 개수 */
    count: recentlyViewed.length,
  };
}
