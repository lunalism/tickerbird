/**
 * 최근 본 종목 유틸리티 함수
 *
 * @description
 * localStorage 기반 최근 본 종목 관리 함수들입니다.
 * SSR 환경에서도 안전하게 동작하도록 설계되었습니다.
 *
 * @features
 * - localStorage에서 데이터 로드/저장
 * - 최대 20개 제한 (오래된 항목 자동 삭제)
 * - 중복 종목 방문 시 최신으로 갱신 (맨 앞으로 이동)
 * - SSR 호환 (클라이언트에서만 localStorage 접근)
 *
 * @extension
 * 추후 Supabase DB 연동 시 이 함수들을 확장하거나
 * 별도의 API 호출 함수로 대체할 수 있습니다.
 *
 * @usage
 * ```typescript
 * import {
 *   getRecentlyViewed,
 *   addRecentlyViewed,
 *   removeRecentlyViewed,
 *   clearRecentlyViewed,
 * } from '@/lib/recentlyViewed';
 *
 * // 조회
 * const stocks = getRecentlyViewed();
 *
 * // 추가
 * addRecentlyViewed({ ticker: 'AAPL', market: 'us', name: 'Apple Inc.' });
 *
 * // 삭제
 * removeRecentlyViewed('AAPL');
 *
 * // 전체 삭제
 * clearRecentlyViewed();
 * ```
 */

import {
  RecentlyViewedStock,
  RecentlyViewedData,
  DEFAULT_RECENTLY_VIEWED_CONFIG,
} from '@/types/recentlyViewed';

// ==================== 상수 ====================

/** localStorage 키 */
const STORAGE_KEY = DEFAULT_RECENTLY_VIEWED_CONFIG.storageKey;

/** 최대 저장 개수 */
const MAX_ITEMS = DEFAULT_RECENTLY_VIEWED_CONFIG.maxItems;

// ==================== 내부 헬퍼 함수 ====================

/**
 * SSR 환경 체크
 *
 * @description
 * window 객체가 존재하는지 확인하여 브라우저 환경인지 판단합니다.
 * Next.js의 서버 사이드 렌더링 시에는 false를 반환합니다.
 *
 * @returns 브라우저 환경이면 true, 서버 환경이면 false
 */
function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

/**
 * localStorage에서 데이터 파싱
 *
 * @description
 * localStorage의 JSON 문자열을 파싱하여 배열로 반환합니다.
 * 파싱 실패 시 빈 배열을 반환합니다.
 *
 * @returns 파싱된 데이터 배열
 */
function parseStoredData(): RecentlyViewedData {
  if (!isBrowser()) {
    return [];
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);

    // 저장된 데이터가 없으면 빈 배열 반환
    if (!stored) {
      return [];
    }

    // JSON 파싱
    const parsed = JSON.parse(stored);

    // 배열 형태 검증
    if (!Array.isArray(parsed)) {
      console.warn('[recentlyViewed] 저장된 데이터가 배열이 아닙니다. 초기화합니다.');
      return [];
    }

    // 각 항목의 필수 필드 검증
    const validItems = parsed.filter((item: unknown): item is RecentlyViewedStock => {
      if (typeof item !== 'object' || item === null) return false;
      const stock = item as Record<string, unknown>;
      return (
        typeof stock.ticker === 'string' &&
        typeof stock.market === 'string' &&
        typeof stock.name === 'string' &&
        typeof stock.viewedAt === 'string'
      );
    });

    return validItems;
  } catch (error) {
    console.error('[recentlyViewed] localStorage 파싱 실패:', error);
    return [];
  }
}

/**
 * localStorage에 데이터 저장
 *
 * @description
 * 데이터를 JSON 문자열로 변환하여 localStorage에 저장합니다.
 *
 * @param data 저장할 데이터 배열
 */
function saveToStorage(data: RecentlyViewedData): void {
  if (!isBrowser()) {
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('[recentlyViewed] localStorage 저장 실패:', error);

    // localStorage 용량 초과 시 오래된 항목 일부 삭제 후 재시도
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      console.warn('[recentlyViewed] 저장 공간 부족. 오래된 항목을 삭제합니다.');
      const reduced = data.slice(0, Math.floor(data.length / 2));
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(reduced));
      } catch {
        console.error('[recentlyViewed] 용량 축소 후에도 저장 실패');
      }
    }
  }
}

// ==================== 공개 함수 ====================

/**
 * 최근 본 종목 목록 조회
 *
 * @description
 * localStorage에서 최근 본 종목 목록을 조회합니다.
 * 결과는 viewedAt 기준 내림차순 (최신순)으로 정렬됩니다.
 *
 * @returns 최근 본 종목 배열 (최대 20개, 최신순)
 *
 * @example
 * ```typescript
 * const stocks = getRecentlyViewed();
 * console.log(stocks);
 * // [
 * //   { ticker: 'AAPL', market: 'us', name: 'Apple', viewedAt: '2024-01-15T10:30:00.000Z' },
 * //   { ticker: '005930', market: 'kr', name: '삼성전자', viewedAt: '2024-01-15T09:00:00.000Z' },
 * //   ...
 * // ]
 * ```
 */
export function getRecentlyViewed(): RecentlyViewedData {
  const data = parseStoredData();

  // viewedAt 기준 내림차순 정렬 (최신이 맨 앞)
  return data.sort((a, b) => {
    const dateA = new Date(a.viewedAt).getTime();
    const dateB = new Date(b.viewedAt).getTime();
    return dateB - dateA;
  });
}

/**
 * 최근 본 종목 추가
 *
 * @description
 * 종목을 최근 본 목록에 추가합니다.
 * - 이미 존재하는 종목은 시간만 갱신 (맨 앞으로 이동)
 * - 20개 초과 시 가장 오래된 항목 자동 삭제
 *
 * @param stock 추가할 종목 정보 (viewedAt 제외)
 * @returns 갱신된 목록
 *
 * @example
 * ```typescript
 * // 새 종목 추가
 * addRecentlyViewed({ ticker: 'AAPL', market: 'us', name: 'Apple Inc.' });
 *
 * // 기존 종목 재방문 (시간만 갱신됨)
 * addRecentlyViewed({ ticker: 'AAPL', market: 'us', name: 'Apple Inc.' });
 * ```
 */
export function addRecentlyViewed(
  stock: Omit<RecentlyViewedStock, 'viewedAt'>
): RecentlyViewedData {
  // 현재 목록 조회
  let data = parseStoredData();

  // 새 항목 생성 (현재 시간으로)
  const newItem: RecentlyViewedStock = {
    ...stock,
    viewedAt: new Date().toISOString(),
  };

  // 기존 항목 중 같은 ticker가 있는지 확인
  const existingIndex = data.findIndex((item) => item.ticker === stock.ticker);

  if (existingIndex !== -1) {
    // 기존 항목 제거 (새 항목으로 대체할 예정)
    data.splice(existingIndex, 1);
    console.log(`[recentlyViewed] ${stock.ticker} 기존 항목 갱신 (최신으로 이동)`);
  } else {
    console.log(`[recentlyViewed] ${stock.ticker} 새로 추가`);
  }

  // 맨 앞에 추가 (최신 항목)
  data.unshift(newItem);

  // 최대 개수 초과 시 오래된 항목 제거
  if (data.length > MAX_ITEMS) {
    const removed = data.splice(MAX_ITEMS);
    console.log(`[recentlyViewed] 최대 개수(${MAX_ITEMS}) 초과로 ${removed.length}개 항목 제거`);
  }

  // 저장
  saveToStorage(data);

  return data;
}

/**
 * 특정 종목 제거
 *
 * @description
 * ticker를 기준으로 특정 종목을 목록에서 제거합니다.
 *
 * @param ticker 제거할 종목의 티커
 * @returns 갱신된 목록
 *
 * @example
 * ```typescript
 * removeRecentlyViewed('AAPL');
 * ```
 */
export function removeRecentlyViewed(ticker: string): RecentlyViewedData {
  let data = parseStoredData();

  // 해당 ticker가 있는지 확인
  const initialLength = data.length;
  data = data.filter((item) => item.ticker !== ticker);

  if (data.length < initialLength) {
    console.log(`[recentlyViewed] ${ticker} 제거 완료`);
    saveToStorage(data);
  } else {
    console.log(`[recentlyViewed] ${ticker}를 찾을 수 없습니다`);
  }

  return data;
}

/**
 * 전체 삭제
 *
 * @description
 * 최근 본 종목 목록을 모두 삭제합니다.
 *
 * @example
 * ```typescript
 * clearRecentlyViewed();
 * ```
 */
export function clearRecentlyViewed(): void {
  if (!isBrowser()) {
    return;
  }

  try {
    localStorage.removeItem(STORAGE_KEY);
    console.log('[recentlyViewed] 전체 삭제 완료');
  } catch (error) {
    console.error('[recentlyViewed] 전체 삭제 실패:', error);
  }
}

/**
 * 특정 종목이 목록에 있는지 확인
 *
 * @description
 * ticker를 기준으로 종목이 최근 본 목록에 있는지 확인합니다.
 *
 * @param ticker 확인할 종목의 티커
 * @returns 목록에 있으면 true, 없으면 false
 *
 * @example
 * ```typescript
 * if (isRecentlyViewed('AAPL')) {
 *   console.log('이미 본 종목입니다');
 * }
 * ```
 */
export function isRecentlyViewed(ticker: string): boolean {
  const data = parseStoredData();
  return data.some((item) => item.ticker === ticker);
}

/**
 * 최근 본 종목 개수 조회
 *
 * @description
 * 현재 저장된 최근 본 종목의 개수를 반환합니다.
 *
 * @returns 최근 본 종목 개수
 *
 * @example
 * ```typescript
 * const count = getRecentlyViewedCount();
 * console.log(`${count}개의 종목을 최근에 봤습니다`);
 * ```
 */
export function getRecentlyViewedCount(): number {
  const data = parseStoredData();
  return data.length;
}
