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
  const { isLoggedIn, isLoading: isAuthLoading, isTestMode, userProfile } = useAuth();

  // === 알림 목록 ===
  const { alerts, refetch: refetchAlerts } = useAlerts();

  // === Refs ===
  // 폴링 interval ID (cleanup용)
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  // 세션 내 발동된 알림 ID 저장 (중복 토스트 방지)
  const triggeredAlertIdsRef = useRef<Set<string>>(new Set());
  // 체크 중 여부 (중복 실행 방지)
  const isCheckingRef = useRef(false);

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

    console.log('[PriceAlertProvider] 🔔 알림 토스트 표시:', {
      stockName: alert.stockName,
      ticker: alert.ticker,
      currentPrice,
      targetPrice: alert.targetPrice,
      direction: alert.direction,
    });

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
    // 테스트 모드에서는 Firestore 업데이트 스킵
    if (isTestMode) {
      console.log('[PriceAlertProvider] 테스트 모드 - Firestore 업데이트 스킵:', alertId);
      return;
    }

    try {
      // Firestore price_alerts/{alertId} 문서 업데이트
      const alertDocRef = doc(db, 'price_alerts', alertId);
      await updateDoc(alertDocRef, {
        isTriggered: true,
        triggeredAt: serverTimestamp(),
      });

      console.log('[PriceAlertProvider] ✅ Firestore 업데이트 완료:', alertId);
    } catch (err) {
      // 에러 발생해도 조용히 실패 (토스트는 이미 표시됨)
      console.error('[PriceAlertProvider] ❌ Firestore 업데이트 실패:', alertId, err);
    }
  }, [isTestMode]);

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
   * 모든 활성 알림 체크
   *
   * 1. 활성화된 알림 필터링 (isActive=true, isTriggered=false)
   * 2. 같은 종목은 시세 1번만 조회 (최적화)
   * 3. 목표가 도달 시 토스트 발동 + Firestore 업데이트
   */
  const checkAllAlerts = useCallback(async () => {
    // 중복 실행 방지
    if (isCheckingRef.current) {
      console.log('[PriceAlertProvider] 이미 체크 중 - 스킵');
      return;
    }

    // Auth 로딩 중에는 체크하지 않음
    if (isAuthLoading) {
      console.log('[PriceAlertProvider] Auth 로딩 중 - 스킵');
      return;
    }

    // 비로그인 상태에서는 체크하지 않음
    if (!isLoggedIn) {
      console.log('[PriceAlertProvider] 비로그인 상태 - 스킵');
      return;
    }

    // 활성 알림 필터링 (활성화 + 미발동)
    const activeAlerts = alerts.filter(alert =>
      alert.isActive &&
      !alert.isTriggered &&
      !triggeredAlertIdsRef.current.has(alert.id) // 세션 내 발동된 알림 제외
    );

    // 활성 알림이 없으면 시세 조회 안함
    if (activeAlerts.length === 0) {
      console.log('[PriceAlertProvider] 활성 알림 없음 - 시세 조회 스킵');
      return;
    }

    console.log(`[PriceAlertProvider] 📊 알림 체크 시작: ${activeAlerts.length}개 알림`);
    isCheckingRef.current = true;

    try {
      // 같은 종목은 시세 1번만 조회하기 위해 중복 제거
      // Map<"ticker-market", PriceAlert[]>
      const tickerMap = new Map<string, PriceAlert[]>();
      for (const alert of activeAlerts) {
        const key = `${alert.ticker}-${alert.market}`;
        const existing = tickerMap.get(key) || [];
        tickerMap.set(key, [...existing, alert]);
      }

      console.log(`[PriceAlertProvider] 📡 시세 조회 대상: ${tickerMap.size}개 종목`);

      // 각 종목별 시세 조회 및 알림 체크
      const triggeredAlerts: { alert: PriceAlert; currentPrice: number }[] = [];

      for (const [key, alertsForTicker] of tickerMap) {
        const [ticker, market] = key.split('-') as [string, AlertMarket];

        // 시세 조회
        const currentPrice = await fetchStockPrice(ticker, market);

        if (currentPrice === null) {
          // 시세 조회 실패 시 해당 종목 스킵
          continue;
        }

        // 해당 종목의 모든 알림에 대해 발동 조건 체크
        for (const alert of alertsForTicker) {
          // 발동 조건 체크
          // direction='above': 현재가 >= 목표가이면 발동
          // direction='below': 현재가 <= 목표가이면 발동
          const isTriggered = alert.direction === 'above'
            ? currentPrice >= alert.targetPrice
            : currentPrice <= alert.targetPrice;

          if (isTriggered) {
            console.log('[PriceAlertProvider] 🎯 알림 발동 조건 충족:', {
              ticker: alert.ticker,
              stockName: alert.stockName,
              currentPrice,
              targetPrice: alert.targetPrice,
              direction: alert.direction,
            });

            triggeredAlerts.push({ alert, currentPrice });
          }
        }
      }

      // 발동된 알림 처리
      for (const { alert, currentPrice } of triggeredAlerts) {
        // 세션 내 중복 발동 방지를 위해 ID 저장
        triggeredAlertIdsRef.current.add(alert.id);

        // 토스트 알림 표시
        showAlertToast(alert, currentPrice);

        // Firestore 업데이트 (비동기로 처리)
        triggerAlertInFirestore(alert.id);
      }

      // 발동된 알림이 있으면 목록 새로고침
      if (triggeredAlerts.length > 0) {
        console.log(`[PriceAlertProvider] ✅ ${triggeredAlerts.length}개 알림 발동 완료`);
        await refetchAlerts();
      } else {
        console.log('[PriceAlertProvider] ✅ 알림 체크 완료 - 발동된 알림 없음');
      }

    } catch (err) {
      // 에러 발생 시 조용히 실패 (사용자에게 에러 표시 X)
      console.error('[PriceAlertProvider] 알림 체크 에러:', err);
    } finally {
      isCheckingRef.current = false;
    }
  }, [isAuthLoading, isLoggedIn, alerts, fetchStockPrice, showAlertToast, triggerAlertInFirestore, refetchAlerts]);

  /**
   * 폴링 시작
   */
  const startPolling = useCallback(() => {
    // 기존 interval 정리
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    console.log('[PriceAlertProvider] ⏰ 폴링 시작 (10초 간격)');

    // 30초마다 알림 체크
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
      console.log('[PriceAlertProvider] ⏸️ 폴링 중지');
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
      console.log('[PriceAlertProvider] 🟢 로그인 감지 - 알림 체크 시작');
      checkAllAlerts(); // 즉시 1회 체크
      startPolling();
    } else {
      // 로그아웃 상태: 폴링 중지
      console.log('[PriceAlertProvider] 🔴 로그아웃 감지 - 폴링 중지');
      stopPolling();
      // 세션 내 발동 기록 초기화
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
        // 탭 비활성화: 폴링 중지
        console.log('[PriceAlertProvider] 👁️ 탭 비활성화 - 폴링 일시 중지');
        stopPolling();
      } else {
        // 탭 활성화: 즉시 체크 + 폴링 재개
        console.log('[PriceAlertProvider] 👁️ 탭 활성화 - 즉시 체크 + 폴링 재개');
        checkAllAlerts(); // 즉시 1회 체크
        startPolling();
      }
    };

    // visibilitychange 이벤트 리스너 등록
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup: 이벤트 리스너 해제
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isLoggedIn, checkAllAlerts, startPolling, stopPolling]);

  // children만 렌더링 (UI 없음)
  return <>{children}</>;
}
