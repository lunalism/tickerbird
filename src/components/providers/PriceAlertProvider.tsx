/**
 * PriceAlertProvider - 실시간 가격 알림 체크 Provider
 *
 * 앱 전체에서 백그라운드로 가격 알림을 체크하는 Provider입니다.
 * 10초마다 활성화된 알림의 목표가 도달 여부를 확인하고,
 * 조건 충족 시 토스트 알림을 발동합니다.
 *
 * 주요 기능:
 * - 10초마다 활성 알림 폴링 (setInterval)
 * - 브라우저 탭 비활성화 시 폴링 중지 (배터리/성능 절약)
 * - 탭 활성화 시 즉시 체크 + 폴링 재개
 * - 중복 알림 방지 (이미 발동된 알림은 재발동 안함)
 * - API 호출 최적화 (같은 종목은 시세 1번만 조회)
 * - 에러 발생 시 조용히 실패 (사용자에게 에러 표시 X)
 *
 * 사용 위치:
 * - layout.tsx에서 AuthProvider 안쪽에 배치
 * - 로그인 상태일 때만 폴링 동작
 *
 * @example
 * ```tsx
 * // layout.tsx
 * <AuthProvider>
 *   <PriceAlertProvider>
 *     {children}
 *   </PriceAlertProvider>
 * </AuthProvider>
 * ```
 */

'use client';

import { useEffect, useRef, useCallback, ReactNode } from 'react';
import { toast } from 'sonner';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from './AuthProvider';
import { useAlerts } from '@/hooks/useAlerts';
import { PriceAlert, AlertMarket } from '@/types/priceAlert';

// 개발 환경에서만 로그 출력
const isDev = process.env.NODE_ENV === 'development';

/**
 * 폴링 간격 (밀리초)
 * 10초 = 10000ms
 */
const POLLING_INTERVAL = 10000;

/**
 * PriceAlertProvider Props
 */
interface PriceAlertProviderProps {
  children: ReactNode;
}

/**
 * 시세 응답 타입 (KIS API)
 */
interface StockPriceResponse {
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  name: string;
  symbol: string;
}

/**
 * PriceAlertProvider 컴포넌트
 *
 * 앱 전체에서 가격 알림을 백그라운드로 체크합니다.
 */
export function PriceAlertProvider({ children }: PriceAlertProviderProps) {
  // === 인증 상태 ===
  const { isLoggedIn, isLoading: isAuthLoading, userProfile } = useAuth();

  // === 알림 목록 ===
  const { alerts, refetch: refetchAlerts } = useAlerts();

  // === Refs ===
  // 폴링 interval ID (cleanup용)
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  // 세션 내 발동된 알림 ID 저장 (중복 토스트 방지)
  const triggeredAlertIdsRef = useRef<Set<string>>(new Set());
  // 체크 중 여부 (중복 실행 방지)
  const isCheckingRef = useRef(false);
  // 알림 목록을 ref로 관리 (의존성 배열에서 제외하여 무한 루프 방지)
  const alertsRef = useRef<PriceAlert[]>([]);

  // alerts가 변경될 때마다 ref 업데이트
  useEffect(() => {
    alertsRef.current = alerts;
  }, [alerts]);

  /**
   * 가격 포맷팅 (토스트 표시용)
   *
   * @param price 가격
   * @param market 시장 구분 (KR/US)
   * @returns 포맷된 가격 문자열
   */
  const formatPrice = useCallback((price: number, market: AlertMarket): string => {
    if (market === 'KR') {
      return price.toLocaleString('ko-KR') + '원';
    }
    return '$' + price.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }, []);

  /**
   * 알림 발동 토스트 표시
   *
   * @param alert 발동된 알림 객체
   * @param currentPrice 발동 당시 현재가
   */
  const showAlertToast = useCallback((alert: PriceAlert, currentPrice: number) => {
    // 방향 텍스트 (이상/이하)
    const directionText = alert.direction === 'above' ? '이상' : '이하';

    // 토스트 설명 텍스트
    const description = `${alert.stockName} ${formatPrice(currentPrice, alert.market as AlertMarket)} (목표: ${formatPrice(alert.targetPrice, alert.market as AlertMarket)} ${directionText})`;

    // sonner 토스트 표시
    toast('🔔 목표가 도달!', {
      description,
      duration: 5000, // 5초 동안 표시
      action: {
        label: '확인하기',
        onClick: () => {
          // 가격 알림 페이지로 이동
          window.location.href = '/alerts';
        },
      },
    });
  }, [formatPrice]);

  /**
   * Firestore에서 알림을 발동 상태로 업데이트
   *
   * @param alertId 알림 ID
   */
  const triggerAlertInFirestore = useCallback(async (alertId: string) => {
    try {
      const alertDocRef = doc(db, 'price_alerts', alertId);
      await updateDoc(alertDocRef, {
        isTriggered: true,
        triggeredAt: serverTimestamp(),
      });
    } catch (err) {
      // 에러 발생해도 조용히 실패 (토스트는 이미 표시됨)
      console.error('[PriceAlertProvider] ❌ Firestore 업데이트 실패:', alertId, err);
    }
  }, []);

  /**
   * 단일 종목 시세 조회
   *
   * @param ticker 종목 코드
   * @param market 시장 구분
   * @returns 현재가 (조회 실패 시 null)
   */
  const fetchStockPrice = useCallback(async (
    ticker: string,
    market: AlertMarket
  ): Promise<number | null> => {
    try {
      // 시장별 API 엔드포인트 결정
      const endpoint = market === 'KR'
        ? `/api/kis/stock/price?symbol=${ticker}`
        : `/api/kis/overseas/stock/price?symbol=${ticker}`;

      const response = await fetch(endpoint);

      if (!response.ok) {
        console.warn(`[PriceAlertProvider] 시세 조회 실패: ${ticker} (${response.status})`);
        return null;
      }

      const data: StockPriceResponse = await response.json();
      return data.price;
    } catch (err) {
      // 에러 발생 시 조용히 실패
      console.warn(`[PriceAlertProvider] 시세 조회 에러: ${ticker}`, err);
      return null;
    }
  }, []);

  /**
   * 모든 활성 알림 체크 (최적화)
   *
   * 1. 활성화된 알림 필터링 (isActive=true, isTriggered=false)
   * 2. 같은 종목은 시세 1번만 조회 (최적화)
   * 3. 목표가 도달 시 토스트 발동 + Firestore 업데이트
   *
   * 주의: alerts 대신 alertsRef.current 사용 (무한 루프 방지)
   */
  const checkAllAlerts = useCallback(async () => {
    // 중복 실행 방지
    if (isCheckingRef.current) {
      return;
    }

    // Auth 로딩 중에는 체크하지 않음
    if (isAuthLoading) {
      return;
    }

    // 비로그인 상태에서는 체크하지 않음
    if (!isLoggedIn) {
      return;
    }

    // alertsRef.current 사용 (의존성 배열에서 제외)
    const currentAlerts = alertsRef.current;

    // 활성 알림 필터링 (활성화 + 미발동)
    const activeAlerts = currentAlerts.filter(alert =>
      alert.isActive &&
      !alert.isTriggered &&
      !triggeredAlertIdsRef.current.has(alert.id) // 세션 내 발동된 알림 제외
    );

    // 활성 알림이 없으면 시세 조회 안함
    if (activeAlerts.length === 0) {
      return;
    }

    if (isDev) {
      console.log(`[PriceAlertProvider] 알림 체크: ${activeAlerts.length}개`);
    }
    isCheckingRef.current = true;

    try {
      // 같은 종목은 시세 1번만 조회하기 위해 중복 제거
      const tickerMap = new Map<string, PriceAlert[]>();
      for (const alert of activeAlerts) {
        const key = `${alert.ticker}-${alert.market}`;
        const existing = tickerMap.get(key) || [];
        tickerMap.set(key, [...existing, alert]);
      }

      // 각 종목별 시세 조회 및 알림 체크
      const triggeredAlerts: { alert: PriceAlert; currentPrice: number }[] = [];

      for (const [key, alertsForTicker] of tickerMap) {
        const [ticker, market] = key.split('-') as [string, AlertMarket];

        // 시세 조회
        const currentPrice = await fetchStockPrice(ticker, market);

        if (currentPrice === null) {
          continue;
        }

        // 해당 종목의 모든 알림에 대해 발동 조건 체크
        for (const alert of alertsForTicker) {
          const isTriggered = alert.direction === 'above'
            ? currentPrice >= alert.targetPrice
            : currentPrice <= alert.targetPrice;

          if (isTriggered) {
            triggeredAlerts.push({ alert, currentPrice });
          }
        }
      }

      // 발동된 알림 처리
      for (const { alert, currentPrice } of triggeredAlerts) {
        triggeredAlertIdsRef.current.add(alert.id);
        showAlertToast(alert, currentPrice);
        triggerAlertInFirestore(alert.id);
      }

      // 발동된 알림이 있으면 목록 새로고침
      if (triggeredAlerts.length > 0) {
        if (isDev) {
          console.log(`[PriceAlertProvider] ${triggeredAlerts.length}개 알림 발동`);
        }
        await refetchAlerts();
      }

    } catch (err) {
      // 에러 발생 시 조용히 실패
      if (isDev) {
        console.error('[PriceAlertProvider] 알림 체크 에러:', err);
      }
    } finally {
      isCheckingRef.current = false;
    }
  }, [isAuthLoading, isLoggedIn, fetchStockPrice, showAlertToast, triggerAlertInFirestore, refetchAlerts]); // alerts 의존성 제거

  /**
   * 폴링 시작
   */
  const startPolling = useCallback(() => {
    // 기존 interval 정리
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // 10초마다 알림 체크
    intervalRef.current = setInterval(() => {
      checkAllAlerts();
    }, POLLING_INTERVAL);
  }, [checkAllAlerts]);

  /**
   * 폴링 중지
   */
  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  /**
   * 메인 Effect: 폴링 시작/중지
   *
   * - 로그인 상태일 때만 폴링 시작
   * - 로그아웃 시 폴링 중지
   * - 컴포넌트 언마운트 시 폴링 정리
   */
  useEffect(() => {
    // Auth 로딩 중에는 대기
    if (isAuthLoading) {
      return;
    }

    if (isLoggedIn) {
      // 로그인 상태: 즉시 1회 체크 + 폴링 시작
      checkAllAlerts();
      startPolling();
    } else {
      // 로그아웃 상태: 폴링 중지
      stopPolling();
      triggeredAlertIdsRef.current.clear();
    }

    // Cleanup: 컴포넌트 언마운트 시 폴링 정리
    return () => {
      stopPolling();
    };
  }, [isAuthLoading, isLoggedIn, checkAllAlerts, startPolling, stopPolling]);

  /**
   * Page Visibility API: 탭 비활성화/활성화 처리
   *
   * - 탭 비활성화 시 폴링 중지 (배터리/성능 절약)
   * - 탭 활성화 시 즉시 체크 + 폴링 재개
   */
  useEffect(() => {
    // 비로그인 상태에서는 visibility 감지 불필요
    if (!isLoggedIn) {
      return;
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        checkAllAlerts();
        startPolling();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isLoggedIn, checkAllAlerts, startPolling, stopPolling]);

  // children만 렌더링 (UI 없음)
  return <>{children}</>;
}
