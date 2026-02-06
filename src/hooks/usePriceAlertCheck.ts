/**
 * 가격 알림 발동 체크 훅
 *
 * 현재 시세와 설정된 가격 알림을 비교하여 조건 충족 시 알림을 발동합니다.
 *
 * ============================================================
 * 발동 조건:
 * ============================================================
 * - direction='above' && 현재가 >= targetPrice → 발동 (목표가 이상 도달)
 * - direction='below' && 현재가 <= targetPrice → 발동 (목표가 이하 도달)
 *
 * ============================================================
 * 발동 시 동작:
 * ============================================================
 * 1. sonner 토스트 알림 표시 (🔔 아이콘)
 * 2. 브라우저 푸시 알림 표시 (프리미엄 사용자 + 권한 허용 시)
 * 3. Firestore에서 isTriggered = true, triggeredAt 업데이트
 * 4. 이미 발동된 알림은 재발동하지 않음
 *
 * ============================================================
 * 사용 조건:
 * ============================================================
 * - 로그인 상태일 때만 동작
 * - 비로그인 시 아무 동작도 하지 않음
 *
 * ============================================================
 * 브라우저 푸시 알림 (Notification API):
 * ============================================================
 * - 프리미엄 사용자가 푸시 알림을 활성화한 경우에만 표시
 * - 사이트가 열려 있는 동안 가격 조건 충족 시 즉시 알림
 * - Vercel Hobby 플랜에서는 백그라운드 Cron이 제한적이므로
 *   클라이언트 사이드에서 직접 브라우저 알림을 트리거
 *
 * @example
 * ```tsx
 * const { checkPriceAlerts, isChecking } = usePriceAlertCheck();
 *
 * // 여러 종목 시세 한번에 체크
 * checkPriceAlerts([
 *   { ticker: '005930', price: 71000, market: 'KR' },
 *   { ticker: 'AAPL', price: 178.50, market: 'US' },
 * ]);
 *
 * // 단일 종목 체크
 * checkSingleAlert('005930', 71000, 'KR');
 * ```
 */

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { doc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { debug } from '@/lib/debug';
import { useAuth } from '@/components/providers/AuthProvider';
import { useAlerts } from './useAlerts';
import { PriceAlert, AlertMarket } from '@/types/priceAlert';

/**
 * 시세 데이터 타입
 * 알림 체크에 필요한 최소 정보
 */
export interface PriceData {
  /** 종목 코드 (예: '005930', 'AAPL') */
  ticker: string;
  /** 현재 가격 */
  price: number;
  /** 시장 구분 (KR: 한국, US: 미국) */
  market: AlertMarket;
}

/**
 * 발동된 알림 정보
 * 토스트 표시 및 Firestore 업데이트에 사용
 */
interface TriggeredAlertInfo {
  /** 알림 객체 */
  alert: PriceAlert;
  /** 발동 당시 현재가 */
  currentPrice: number;
}

/**
 * usePriceAlertCheck 반환 타입
 */
interface UsePriceAlertCheckReturn {
  /**
   * 여러 종목의 가격 알림을 한번에 체크
   * @param prices 시세 데이터 배열
   */
  checkPriceAlerts: (prices: PriceData[]) => Promise<void>;

  /**
   * 단일 종목의 가격 알림 체크
   * @param ticker 종목 코드
   * @param price 현재가
   * @param market 시장 구분
   */
  checkSingleAlert: (ticker: string, price: number, market: AlertMarket) => Promise<void>;

  /** 체크 진행 중 여부 */
  isChecking: boolean;

  /** 마지막 체크 시간 */
  lastCheckedAt: Date | null;
}

/**
 * 가격 알림 발동 체크 커스텀 훅
 *
 * 시세 페이지, 종목 상세 페이지에서 사용하여 알림 발동 여부를 체크합니다.
 * 폴링 방식으로 시세 로드 시 알림 조건을 비교합니다.
 */
export function usePriceAlertCheck(): UsePriceAlertCheckReturn {
  const router = useRouter();

  // 체크 상태
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);

  // 중복 발동 방지를 위한 Set (세션 동안 발동된 알림 ID 저장)
  // useRef를 사용하여 리렌더링 없이 값 유지
  const triggeredAlertIds = useRef<Set<string>>(new Set());

  // 푸시 알림 활성화 여부 캐시 (Firestore 조회 최소화)
  const pushEnabledCache = useRef<{ enabled: boolean; checkedAt: number } | null>(null);

  /**
   * 인증 상태 - useAuth() 훅 사용
   *
   * useAuthStore 대신 useAuth()를 사용하는 이유:
   * - useAuth()는 Firebase Auth 상태를 관리
   * - Sidebar와 동일한 방식으로 로그인 상태 체크
   */
  const { user, isLoggedIn, isLoading: isAuthLoading, isPremium } = useAuth();

  // 디버그 로그: 인증 상태 확인
  useEffect(() => {
    debug.log('[usePriceAlertCheck] 인증 상태:', {
      isLoggedIn,
      isAuthLoading,
    });
  }, [isLoggedIn, isAuthLoading]);

  // 알림 목록 조회 (이미 발동된 알림 제외됨)
  const { alerts, refetch } = useAlerts();

  /**
   * 가격 포맷팅 (토스트 표시용)
   *
   * @param price 가격
   * @param market 시장 구분
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
   * sonner 토스트를 사용하여 목표가 도달 알림을 표시합니다.
   * 클릭 시 가격 알림 페이지로 이동합니다.
   *
   * @param alert 발동된 알림 객체
   * @param currentPrice 발동 당시 현재가
   */
  const showAlertToast = useCallback((alert: PriceAlert, currentPrice: number) => {
    // 방향 텍스트 (이상/이하)
    const directionText = alert.direction === 'above' ? '이상' : '이하';

    // 토스트 설명 텍스트
    const description = `${alert.stockName} ${formatPrice(currentPrice, alert.market as AlertMarket)} (목표: ${formatPrice(alert.targetPrice, alert.market as AlertMarket)} ${directionText})`;

    debug.log('[PriceAlertCheck] 🔔 알림 토스트 표시:', {
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
          router.push('/alerts');
        },
      },
    });
  }, [formatPrice, router]);

  /**
   * 푸시 알림 활성화 여부 확인
   *
   * Firestore에서 사용자의 푸시 알림 설정을 조회합니다.
   * 성능 최적화를 위해 5분간 캐시됩니다.
   *
   * @returns 푸시 알림 활성화 여부
   */
  const checkPushEnabled = useCallback(async (): Promise<boolean> => {
    // 비로그인 또는 비프리미엄 사용자는 푸시 알림 사용 불가
    if (!user?.uid || !isPremium) {
      return false;
    }

    // 브라우저 Notification API 지원 확인
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }

    // 알림 권한 확인
    if (Notification.permission !== 'granted') {
      return false;
    }

    // 캐시가 있고 5분 이내면 캐시 사용
    const now = Date.now();
    if (pushEnabledCache.current && now - pushEnabledCache.current.checkedAt < 5 * 60 * 1000) {
      return pushEnabledCache.current.enabled;
    }

    // Firestore에서 푸시 알림 설정 조회
    try {
      const settingsRef = doc(db, 'users', user.uid, 'settings', 'pushNotification');
      const settingsDoc = await getDoc(settingsRef);

      const enabled = settingsDoc.exists() && settingsDoc.data()?.enabled === true;

      // 캐시 업데이트
      pushEnabledCache.current = { enabled, checkedAt: now };

      return enabled;
    } catch (error) {
      debug.log('[PriceAlertCheck] 푸시 설정 조회 실패:', error);
      return false;
    }
  }, [user?.uid, isPremium]);

  /**
   * 브라우저 푸시 알림 표시 (Notification API)
   *
   * 프리미엄 사용자가 푸시 알림을 활성화한 경우에만 표시됩니다.
   * 사이트가 열려 있는 동안 조건 충족 시 브라우저 알림을 직접 표시합니다.
   *
   * Vercel Hobby 플랜에서는 백그라운드 Cron이 제한적이므로
   * 클라이언트 사이드에서 직접 브라우저 알림을 트리거합니다.
   *
   * @param alert 발동된 알림 객체
   * @param currentPrice 발동 당시 현재가
   */
  const showBrowserNotification = useCallback(async (alert: PriceAlert, currentPrice: number) => {
    // 푸시 알림 활성화 여부 확인
    const pushEnabled = await checkPushEnabled();
    if (!pushEnabled) {
      return;
    }

    // 알림 제목과 본문 구성
    const directionText = alert.direction === 'above' ? '상승' : '하락';
    const formattedPrice = formatPrice(currentPrice, alert.market as AlertMarket);
    const formattedTarget = formatPrice(alert.targetPrice, alert.market as AlertMarket);

    const title = `📈 ${alert.stockName} 목표가 ${directionText}!`;
    const body = `${alert.stockName}이(가) ${formattedPrice}에 도달했습니다. (목표가: ${formattedTarget})`;

    debug.log('[PriceAlertCheck] 🔔 브라우저 푸시 알림 표시:', {
      title,
      body,
      ticker: alert.ticker,
    });

    try {
      // 브라우저 Notification API로 알림 표시
      const notification = new Notification(title, {
        body,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        tag: `price-alert-${alert.id}`, // 같은 알림 중복 방지
        requireInteraction: true, // 사용자가 닫을 때까지 유지
        data: {
          ticker: alert.ticker,
          market: alert.market,
          alertId: alert.id,
        },
      });

      // 알림 클릭 시 종목 상세 페이지로 이동
      notification.onclick = () => {
        const market = alert.market === 'KR' ? 'kr' : 'us';
        window.focus();
        router.push(`/market/${alert.ticker}?market=${market}`);
        notification.close();
      };
    } catch (error) {
      debug.log('[PriceAlertCheck] 브라우저 알림 표시 실패:', error);
    }
  }, [checkPushEnabled, formatPrice, router]);

  /**
   * Firestore에서 알림을 발동 상태로 업데이트
   *
   * isTriggered = true, triggeredAt = serverTimestamp()로 업데이트합니다.
   * 테스트 모드에서는 Firestore 업데이트를 스킵합니다.
   *
   * @param alertId 알림 ID
   */
  const triggerAlertInFirestore = useCallback(async (alertId: string) => {
    try {
      // Firestore price_alerts/{alertId} 문서 업데이트
      const alertDocRef = doc(db, 'price_alerts', alertId);
      await updateDoc(alertDocRef, {
        isTriggered: true,
        triggeredAt: serverTimestamp(),
      });

      debug.log('[PriceAlertCheck] ✅ Firestore 업데이트 완료:', alertId);
    } catch (err) {
      console.error('[PriceAlertCheck] ❌ Firestore 업데이트 실패:', alertId, err);
      // 에러가 발생해도 토스트는 이미 표시됐으므로 계속 진행
    }
  }, []);

  /**
   * 단일 알림의 발동 조건 체크
   *
   * @param alert 알림 객체
   * @param currentPrice 현재가
   * @returns 발동 여부 (true: 발동, false: 미발동)
   */
  const checkAlertCondition = useCallback((alert: PriceAlert, currentPrice: number): boolean => {
    // 발동 조건 체크
    // direction='above': 현재가 >= 목표가이면 발동
    // direction='below': 현재가 <= 목표가이면 발동
    if (alert.direction === 'above') {
      return currentPrice >= alert.targetPrice;
    } else {
      return currentPrice <= alert.targetPrice;
    }
  }, []);

  /**
   * 여러 종목의 가격 알림을 한번에 체크
   *
   * 시세 페이지에서 여러 종목 데이터 로드 후 호출합니다.
   * 활성화된 알림만 체크하고, 이미 발동된 알림은 무시합니다.
   *
   * @param prices 시세 데이터 배열
   */
  const checkPriceAlerts = useCallback(async (prices: PriceData[]) => {
    // Auth 로딩 중에는 체크하지 않음
    if (isAuthLoading) {
      debug.log('[PriceAlertCheck] Auth 로딩 중 - 체크 스킵');
      return;
    }

    // 비로그인 상태에서는 체크하지 않음
    if (!isLoggedIn) {
      debug.log('[PriceAlertCheck] 비로그인 상태 - 체크 스킵');
      return;
    }

    // 알림이 없으면 체크하지 않음
    if (alerts.length === 0) {
      debug.log('[PriceAlertCheck] 활성 알림 없음 - 체크 스킵');
      return;
    }

    // 시세 데이터가 없으면 체크하지 않음
    if (prices.length === 0) {
      debug.log('[PriceAlertCheck] 시세 데이터 없음 - 체크 스킵');
      return;
    }

    setIsChecking(true);

    debug.log('[PriceAlertCheck] 알림 체크 시작:', {
      alertCount: alerts.length,
      priceCount: prices.length,
    });

    try {
      // 발동할 알림 목록
      const triggeredAlerts: TriggeredAlertInfo[] = [];

      // 시세 데이터를 ticker로 빠르게 조회하기 위한 Map 생성
      const priceMap = new Map<string, PriceData>();
      for (const priceData of prices) {
        priceMap.set(priceData.ticker, priceData);
      }

      // 각 알림에 대해 발동 조건 체크
      for (const alert of alerts) {
        // 이미 발동된 알림은 스킵 (Firestore에서 isTriggered=true인 경우)
        if (alert.isTriggered) {
          continue;
        }

        // 비활성화된 알림은 스킵
        if (!alert.isActive) {
          continue;
        }

        // 세션 내에서 이미 발동된 알림은 스킵 (중복 토스트 방지)
        if (triggeredAlertIds.current.has(alert.id)) {
          continue;
        }

        // 해당 종목의 시세 데이터 찾기
        const priceData = priceMap.get(alert.ticker);
        if (!priceData) {
          // 시세 데이터가 없으면 스킵
          continue;
        }

        // 시장 구분 일치 확인
        if (priceData.market !== alert.market) {
          continue;
        }

        // 발동 조건 체크
        const isTriggered = checkAlertCondition(alert, priceData.price);

        if (isTriggered) {
          debug.log('[PriceAlertCheck] 🎯 알림 발동 조건 충족:', {
            ticker: alert.ticker,
            stockName: alert.stockName,
            currentPrice: priceData.price,
            targetPrice: alert.targetPrice,
            direction: alert.direction,
          });

          triggeredAlerts.push({
            alert,
            currentPrice: priceData.price,
          });
        }
      }

      // 발동된 알림 처리
      for (const { alert, currentPrice } of triggeredAlerts) {
        // 세션 내 중복 발동 방지를 위해 ID 저장
        triggeredAlertIds.current.add(alert.id);

        // 토스트 알림 표시 (사이트 내 알림)
        showAlertToast(alert, currentPrice);

        // 브라우저 푸시 알림 표시 (프리미엄 사용자 + 권한 허용 시)
        // 비동기로 처리, 에러 발생해도 계속 진행
        showBrowserNotification(alert, currentPrice);

        // Firestore 업데이트 (비동기로 처리, 에러 발생해도 계속 진행)
        triggerAlertInFirestore(alert.id);
      }

      // 발동된 알림이 있으면 알림 목록 새로고침
      if (triggeredAlerts.length > 0) {
        debug.log('[PriceAlertCheck] 발동된 알림 수:', triggeredAlerts.length);
        // 알림 목록 갱신 (발동된 알림 상태 반영)
        await refetch();
      }

      setLastCheckedAt(new Date());

    } catch (err) {
      console.error('[PriceAlertCheck] 알림 체크 에러:', err);
    } finally {
      setIsChecking(false);
    }
  }, [isAuthLoading, isLoggedIn, alerts, checkAlertCondition, showAlertToast, showBrowserNotification, triggerAlertInFirestore, refetch]);

  /**
   * 단일 종목의 가격 알림 체크
   *
   * 종목 상세 페이지에서 해당 종목만 체크할 때 사용합니다.
   *
   * @param ticker 종목 코드
   * @param price 현재가
   * @param market 시장 구분
   */
  const checkSingleAlert = useCallback(async (
    ticker: string,
    price: number,
    market: AlertMarket
  ) => {
    await checkPriceAlerts([{ ticker, price, market }]);
  }, [checkPriceAlerts]);

  return {
    checkPriceAlerts,
    checkSingleAlert,
    isChecking,
    lastCheckedAt,
  };
}
