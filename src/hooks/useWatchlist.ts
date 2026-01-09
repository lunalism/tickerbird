'use client';

/**
 * useWatchlist 커스텀 훅
 *
 * @description
 * 관심종목 관리 훅 - Supabase DB 연동 (로그인 사용자 전용)
 *
 * 작동 방식:
 * - 로그인 사용자: Supabase DB에 저장 (계정 간 동기화)
 * - 비로그인 사용자: 기능 사용 불가 (requiresLogin = true)
 *
 * 주요 기능:
 * - 관심종목 추가/제거/조회
 * - 로그인 시 Supabase에서 자동 불러오기
 * - 로그아웃 시 로컬 상태 초기화
 *
 * @usage
 * ```tsx
 * const { watchlist, addToWatchlist, removeFromWatchlist, isInWatchlist, requiresLogin } = useWatchlist();
 *
 * // 비로그인 시 로그인 안내
 * if (requiresLogin) {
 *   return <LoginPrompt />;
 * }
 *
 * // 관심종목 추가
 * addToWatchlist({ ticker: '005930', name: '삼성전자', market: 'kr' });
 *
 * // 관심종목 제거
 * removeFromWatchlist('005930');
 *
 * // 관심종목 여부 확인
 * const isWatching = isInWatchlist('005930');
 * ```
 */

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/providers/AuthProvider';

// ==================== 타입 정의 ====================

/**
 * 관심종목 아이템 인터페이스
 */
export interface WatchlistItem {
  /** 종목 티커 (예: "005930", "AAPL") */
  ticker: string;
  /** 종목명 (예: "삼성전자", "Apple Inc.") */
  name: string;
  /** 시장 구분 (kr: 한국, us: 미국, jp: 일본, hk: 홍콩) */
  market: 'kr' | 'us' | 'jp' | 'hk';
  /** 추가된 시간 (ISO 문자열) */
  addedAt?: string;
}

/**
 * Supabase watchlist 테이블 타입
 */
interface WatchlistRow {
  id: string;
  user_id: string;
  ticker: string;
  market: string;
  stock_name: string;
  created_at: string;
}

// ==================== 유틸리티 함수 ====================

/**
 * 시장 코드 변환 (DB → 클라이언트)
 * DB에서는 'KR', 'US' (대문자), 클라이언트에서는 'kr', 'us' (소문자)
 */
const dbMarketToClient = (market: string): 'kr' | 'us' | 'jp' | 'hk' => {
  const map: Record<string, 'kr' | 'us' | 'jp' | 'hk'> = {
    'KR': 'kr',
    'US': 'us',
    'JP': 'jp',
    'HK': 'hk',
  };
  return map[market] || 'kr';
};

/**
 * 시장 코드 변환 (클라이언트 → DB)
 */
const clientMarketToDb = (market: 'kr' | 'us' | 'jp' | 'hk'): string => {
  return market.toUpperCase();
};

/**
 * DB 행을 WatchlistItem으로 변환
 */
const rowToItem = (row: WatchlistRow): WatchlistItem => ({
  ticker: row.ticker,
  name: row.stock_name,
  market: dbMarketToClient(row.market),
  addedAt: row.created_at,
});

// ==================== 훅 ====================

/**
 * 관심종목 관리 훅 (로그인 사용자 전용)
 *
 * @returns 관심종목 상태 및 관리 함수
 */
export function useWatchlist() {
  // ========================================
  // 상태
  // ========================================

  /** 관심종목 목록 */
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);

  /** 로딩 상태 */
  const [isLoading, setIsLoading] = useState(true);

  /** 초기 로드 완료 여부 */
  const [isLoaded, setIsLoaded] = useState(false);

  // 인증 상태에서 사용자 정보 가져오기
  const { user, isLoading: authLoading, isLoggedIn } = useAuth();

  // ========================================
  // Supabase에서 관심종목 불러오기
  // ========================================
  const fetchFromSupabase = useCallback(async (userId: string) => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('watchlist')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data as WatchlistRow[]).map(rowToItem);
    } catch {
      return [];
    }
  }, []);

  // ========================================
  // 초기 로드 (로그인 사용자만)
  // ========================================
  useEffect(() => {
    // 인증 상태 확인이 완료될 때까지 대기
    if (authLoading) return;

    const loadWatchlist = async () => {
      setIsLoading(true);

      if (user) {
        // 로그인 상태: Supabase에서 불러오기
        const items = await fetchFromSupabase(user.id);
        setWatchlist(items);
      } else {
        // 비로그인 상태: 빈 배열로 초기화
        setWatchlist([]);
      }

      setIsLoading(false);
      setIsLoaded(true);
    };

    loadWatchlist();
  }, [user, authLoading, fetchFromSupabase]);

  // ========================================
  // 관심종목 추가 (로그인 필수)
  // ========================================
  const addToWatchlist = useCallback(async (item: Omit<WatchlistItem, 'addedAt'>): Promise<boolean> => {
    // 비로그인 시 실패 반환
    if (!user) {
      return false;
    }

    // 이미 존재하는지 확인
    const exists = watchlist.some((w) => w.ticker === item.ticker);
    if (exists) {
      return false;
    }

    // 새 아이템 생성
    const newItem: WatchlistItem = {
      ...item,
      addedAt: new Date().toISOString(),
    };

    // Supabase에 저장
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('watchlist')
        .insert({
          user_id: user.id,
          ticker: item.ticker,
          stock_name: item.name,
          market: clientMarketToDb(item.market),
        });

      if (error) throw error;

      // 로컬 상태 업데이트
      setWatchlist((prev) => [newItem, ...prev]);
      return true;
    } catch {
      return false;
    }
  }, [watchlist, user]);

  // ========================================
  // 관심종목 제거 (로그인 필수)
  // ========================================
  const removeFromWatchlist = useCallback(async (ticker: string): Promise<boolean> => {
    // 비로그인 시 실패 반환
    if (!user) {
      return false;
    }

    // Supabase에서 삭제
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('watchlist')
        .delete()
        .eq('user_id', user.id)
        .eq('ticker', ticker);

      if (error) throw error;

      // 로컬 상태 업데이트
      setWatchlist((prev) => prev.filter((w) => w.ticker !== ticker));
      return true;
    } catch {
      return false;
    }
  }, [user]);

  // ========================================
  // 관심종목 토글 (추가/제거) - 로그인 필수
  // ========================================
  const toggleWatchlist = useCallback(
    async (item: Omit<WatchlistItem, 'addedAt'>): Promise<boolean | null> => {
      // 비로그인 시 null 반환 (로그인 필요 표시용)
      if (!user) {
        return null;
      }

      const exists = watchlist.some((w) => w.ticker === item.ticker);
      if (exists) {
        await removeFromWatchlist(item.ticker);
        return false; // 제거됨
      } else {
        await addToWatchlist(item);
        return true; // 추가됨
      }
    },
    [watchlist, user, addToWatchlist, removeFromWatchlist]
  );

  // ========================================
  // 관심종목 여부 확인
  // ========================================
  const isInWatchlist = useCallback(
    (ticker: string): boolean => {
      return watchlist.some((w) => w.ticker === ticker);
    },
    [watchlist]
  );

  // ========================================
  // 특정 시장의 관심종목 조회
  // ========================================
  const getWatchlistByMarket = useCallback(
    (market: 'kr' | 'us' | 'jp' | 'hk'): WatchlistItem[] => {
      return watchlist.filter((w) => w.market === market);
    },
    [watchlist]
  );

  // ========================================
  // 관심종목 전체 삭제 (로그인 필수)
  // ========================================
  const clearWatchlist = useCallback(async () => {
    if (!user) return;

    // Supabase에서 전체 삭제
    try {
      const supabase = createClient();
      await supabase
        .from('watchlist')
        .delete()
        .eq('user_id', user.id);
    } catch {
      // 삭제 실패 시 무시
    }

    // 로컬 상태 초기화
    setWatchlist([]);
  }, [user]);

  // ========================================
  // Supabase에서 다시 불러오기 (외부에서 호출용)
  // ========================================
  const refetch = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    const items = await fetchFromSupabase(user.id);
    setWatchlist(items);
    setIsLoading(false);
  }, [user, fetchFromSupabase]);

  return {
    /** 전체 관심종목 목록 */
    watchlist,
    /** 로딩 중 여부 */
    isLoading,
    /** 초기 로드 완료 여부 */
    isLoaded,
    /** 로그인 필요 여부 (true면 비로그인 상태) */
    requiresLogin: !isLoggedIn && !authLoading,
    /** 관심종목 추가 (로그인 필수) */
    addToWatchlist,
    /** 관심종목 제거 (로그인 필수) */
    removeFromWatchlist,
    /** 관심종목 토글 (추가/제거) - 추가되면 true, 제거되면 false, 비로그인이면 null 반환 */
    toggleWatchlist,
    /** 관심종목 여부 확인 */
    isInWatchlist,
    /** 특정 시장의 관심종목 조회 */
    getWatchlistByMarket,
    /** 관심종목 전체 삭제 (로그인 필수) */
    clearWatchlist,
    /** Supabase에서 다시 불러오기 */
    refetch,
    /** 관심종목 개수 */
    count: watchlist.length,
  };
}
