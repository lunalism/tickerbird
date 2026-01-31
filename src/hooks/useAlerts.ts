/**
 * 가격 알림 커스텀 훅
 *
 * 가격 알림 CRUD 기능을 제공하는 React 훅
 * API 호출 및 상태 관리를 캡슐화
 *
 * 주요 기능:
 * - 알림 목록 조회
 * - 새 알림 추가
 * - 알림 수정 (활성화/비활성화)
 * - 알림 삭제
 *
 * 사용 예:
 * ```tsx
 * const { alerts, isLoading, addAlert, toggleAlert, deleteAlert } = useAlerts();
 * ```
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { debug } from '@/lib/debug';
import {
  PriceAlert,
  CreateAlertRequest,
  UpdateAlertRequest,
  AlertListResponse,
  AlertApiResponse,
} from '@/types/priceAlert';
import { canAddAlert, showAlertLimitReached } from '@/utils/subscription';

/**
 * useAlerts 훅 반환 타입
 */
interface UseAlertsReturn {
  // 알림 목록
  alerts: PriceAlert[];
  // 로딩 상태
  isLoading: boolean;
  // 에러 메시지
  error: string | null;
  // 알림 목록 새로고침
  refetch: () => Promise<void>;
  // 새 알림 추가
  addAlert: (request: CreateAlertRequest) => Promise<{ success: boolean; error?: string }>;
  // 알림 수정 (목표가, 방향 변경)
  updateAlert: (id: string, request: UpdateAlertRequest) => Promise<{ success: boolean; error?: string }>;
  // 알림 활성화/비활성화 토글
  toggleAlert: (id: string, isActive: boolean) => Promise<{ success: boolean; error?: string }>;
  // 알림 삭제
  deleteAlert: (id: string) => Promise<{ success: boolean; error?: string }>;
  // 특정 종목에 대한 알림 존재 여부 확인
  hasAlertForTicker: (ticker: string) => boolean;
  // 특정 종목의 알림 목록
  getAlertsForTicker: (ticker: string) => PriceAlert[];
}

/**
 * 가격 알림 관리 커스텀 훅
 *
 * @returns 알림 데이터 및 CRUD 함수
 */
export function useAlerts(): UseAlertsReturn {
  // 알림 목록 상태
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  // 로딩 상태
  const [isLoading, setIsLoading] = useState(true);
  // 에러 상태
  const [error, setError] = useState<string | null>(null);

  /**
   * 인증 상태 확인 - useAuth() 훅 사용
   *
   * useAuthStore 대신 useAuth()를 사용하는 이유:
   * - useAuth()는 Firebase Auth 상태와 테스트 모드를 모두 고려
   * - isLoggedIn = !!user || (isTestMode && isTestLoggedIn)
   * - Sidebar와 동일한 방식으로 로그인 상태 체크
   *
   * isLoading: Firebase Auth 초기화 로딩 상태
   * - 로딩 중에는 아직 로그인 여부를 판단할 수 없음
   */
  const { isLoggedIn, isLoading: isAuthLoading, isTestMode, userProfile, isPremium } = useAuth();

  // 디버그 로그: 인증 상태 확인
  useEffect(() => {
    debug.log('[useAlerts] 인증 상태:', {
      isLoggedIn,
      isAuthLoading,
      isTestMode,
    });
  }, [isLoggedIn, isAuthLoading, isTestMode]);

  /**
   * 알림 목록 조회
   *
   * API를 호출하여 현재 사용자의 알림 목록을 가져옴
   * Auth 로딩이 완료된 후에만 실행
   */
  const fetchAlerts = useCallback(async () => {
    // Auth 로딩 중에는 대기
    if (isAuthLoading) {
      debug.log('[useAlerts] Auth 로딩 중 - 알림 조회 대기');
      return;
    }

    // 비로그인 상태에서는 조회하지 않음
    if (!isLoggedIn) {
      debug.log('[useAlerts] 비로그인 상태 - 알림 목록 초기화');
      setAlerts([]);
      setIsLoading(false);
      return;
    }

    debug.log('[useAlerts] 알림 목록 조회 시작');
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/alerts', {
        headers: userProfile?.id ? { 'x-user-id': userProfile.id } : {},
      });
      const result: AlertListResponse = await response.json();

      if (result.success && result.data) {
        debug.log('[useAlerts] 알림 목록 조회 성공:', result.data.length, '개');
        setAlerts(result.data);
      } else {
        setError(result.error || '알림 목록을 불러오는데 실패했습니다');
        setAlerts([]);
      }
    } catch (err) {
      console.error('[useAlerts] 알림 조회 에러:', err);
      setError('네트워크 에러가 발생했습니다');
      setAlerts([]);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthLoading, isLoggedIn, userProfile?.id]);

  // 컴포넌트 마운트 및 로그인 상태 변경 시 알림 조회
  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  /**
   * 새 알림 추가 (무료 회원 3개 제한)
   *
   * @param request 알림 생성 요청 데이터
   * @returns 성공 여부
   */
  const addAlert = useCallback(
    async (request: CreateAlertRequest): Promise<{ success: boolean; error?: string }> => {
      debug.log('[useAlerts] addAlert 호출:', { isLoggedIn, isAuthLoading, request });

      // Auth 로딩 중이면 대기 필요
      if (isAuthLoading) {
        debug.log('[useAlerts] Auth 로딩 중 - 알림 추가 대기');
        return { success: false, error: '인증 상태 확인 중입니다. 잠시 후 다시 시도해주세요.' };
      }

      if (!isLoggedIn) {
        debug.log('[useAlerts] 비로그인 상태 - 알림 추가 실패');
        return { success: false, error: '로그인이 필요합니다' };
      }

      // 무료 회원 알림 제한 확인 (3개)
      if (!canAddAlert(isPremium, alerts.length)) {
        debug.log('[useAlerts] 무료 회원 알림 제한 초과');
        showAlertLimitReached();
        // error를 반환하지 않아 호출처에서 중복 토스트 표시 방지
        return { success: false };
      }

      try {
        const response = await fetch('/api/alerts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(userProfile?.id ? { 'x-user-id': userProfile.id } : {}),
          },
          body: JSON.stringify(request),
        });

        const result: AlertApiResponse = await response.json();

        if (result.success && result.data) {
          debug.log('[useAlerts] 알림 추가 성공:', result.data);
          // 새 알림을 목록 맨 앞에 추가
          setAlerts((prev) => [result.data!, ...prev]);
          return { success: true };
        }

        debug.log('[useAlerts] 알림 추가 실패:', result.error);
        return { success: false, error: result.error || '알림 추가에 실패했습니다' };
      } catch (err) {
        console.error('[useAlerts] 알림 추가 에러:', err);
        return { success: false, error: '네트워크 에러가 발생했습니다' };
      }
    },
    [isLoggedIn, isAuthLoading, userProfile?.id, isPremium, alerts.length]
  );

  /**
   * 알림 수정 (목표가, 방향 변경)
   *
   * 목표가나 방향을 변경하면 서버에서 자동으로 isTriggered가 false로 리셋됨
   * 이는 조건이 변경되었으므로 다시 체크해야 하기 때문
   *
   * @param id 알림 ID
   * @param request 수정 요청 데이터 (targetPrice, direction)
   * @returns 성공 여부
   */
  const updateAlert = useCallback(
    async (id: string, request: UpdateAlertRequest): Promise<{ success: boolean; error?: string }> => {
      debug.log('[useAlerts] updateAlert 호출:', { id, request });

      // Auth 로딩 중이면 대기 필요
      if (isAuthLoading) {
        return { success: false, error: '인증 상태 확인 중입니다. 잠시 후 다시 시도해주세요.' };
      }

      if (!isLoggedIn) {
        return { success: false, error: '로그인이 필요합니다' };
      }

      try {
        const response = await fetch(`/api/alerts/${id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...(userProfile?.id ? { 'x-user-id': userProfile.id } : {}),
          },
          body: JSON.stringify(request),
        });

        const result: AlertApiResponse = await response.json();

        if (result.success && result.data) {
          debug.log('[useAlerts] 알림 수정 성공:', result.data);
          // 목록에서 해당 알림 업데이트
          setAlerts((prev) =>
            prev.map((alert) => (alert.id === id ? result.data! : alert))
          );
          return { success: true };
        }

        debug.log('[useAlerts] 알림 수정 실패:', result.error);
        return { success: false, error: result.error || '알림 수정에 실패했습니다' };
      } catch (err) {
        console.error('[useAlerts] 알림 수정 에러:', err);
        return { success: false, error: '네트워크 에러가 발생했습니다' };
      }
    },
    [isLoggedIn, isAuthLoading, userProfile?.id]
  );

  /**
   * 알림 활성화/비활성화 토글
   *
   * @param id 알림 ID
   * @param isActive 새 활성화 상태
   * @returns 성공 여부
   */
  const toggleAlert = useCallback(
    async (id: string, isActive: boolean): Promise<{ success: boolean; error?: string }> => {
      if (isAuthLoading) {
        return { success: false, error: '인증 상태 확인 중입니다. 잠시 후 다시 시도해주세요.' };
      }

      if (!isLoggedIn) {
        return { success: false, error: '로그인이 필요합니다' };
      }

      try {
        const response = await fetch(`/api/alerts/${id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...(userProfile?.id ? { 'x-user-id': userProfile.id } : {}),
          },
          body: JSON.stringify({ isActive }),
        });

        const result: AlertApiResponse = await response.json();

        if (result.success && result.data) {
          // 목록에서 해당 알림 업데이트
          setAlerts((prev) =>
            prev.map((alert) => (alert.id === id ? result.data! : alert))
          );
          return { success: true };
        }

        return { success: false, error: result.error || '알림 수정에 실패했습니다' };
      } catch (err) {
        console.error('[useAlerts] 알림 토글 에러:', err);
        return { success: false, error: '네트워크 에러가 발생했습니다' };
      }
    },
    [isLoggedIn, isAuthLoading, userProfile?.id]
  );

  /**
   * 알림 삭제
   *
   * @param id 알림 ID
   * @returns 성공 여부
   */
  const deleteAlert = useCallback(
    async (id: string): Promise<{ success: boolean; error?: string }> => {
      if (isAuthLoading) {
        return { success: false, error: '인증 상태 확인 중입니다. 잠시 후 다시 시도해주세요.' };
      }

      if (!isLoggedIn) {
        return { success: false, error: '로그인이 필요합니다' };
      }

      try {
        const response = await fetch(`/api/alerts/${id}`, {
          method: 'DELETE',
          headers: userProfile?.id ? { 'x-user-id': userProfile.id } : {},
        });

        const result: AlertApiResponse<null> = await response.json();

        if (result.success) {
          // 목록에서 해당 알림 제거
          setAlerts((prev) => prev.filter((alert) => alert.id !== id));
          return { success: true };
        }

        return { success: false, error: result.error || '알림 삭제에 실패했습니다' };
      } catch (err) {
        console.error('[useAlerts] 알림 삭제 에러:', err);
        return { success: false, error: '네트워크 에러가 발생했습니다' };
      }
    },
    [isLoggedIn, isAuthLoading, userProfile?.id]
  );

  /**
   * 특정 종목에 대한 알림 존재 여부 확인
   *
   * @param ticker 종목 코드
   * @returns 알림 존재 여부
   */
  const hasAlertForTicker = useCallback(
    (ticker: string): boolean => {
      return alerts.some((alert) => alert.ticker === ticker);
    },
    [alerts]
  );

  /**
   * 특정 종목의 알림 목록
   *
   * @param ticker 종목 코드
   * @returns 해당 종목의 알림 목록
   */
  const getAlertsForTicker = useCallback(
    (ticker: string): PriceAlert[] => {
      return alerts.filter((alert) => alert.ticker === ticker);
    },
    [alerts]
  );

  return {
    alerts,
    isLoading,
    error,
    refetch: fetchAlerts,
    addAlert,
    updateAlert,
    toggleAlert,
    deleteAlert,
    hasAlertForTicker,
    getAlertsForTicker,
  };
}
