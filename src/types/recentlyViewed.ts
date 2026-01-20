/**
 * 최근 본 종목 타입 정의
 *
 * @description
 * 최근 본 종목 기능에서 사용되는 타입들을 정의합니다.
 * localStorage에 저장될 데이터 구조와 관련 타입들을 포함합니다.
 *
 * @usage
 * ```typescript
 * import { RecentlyViewedStock, MarketType } from '@/types/recentlyViewed';
 *
 * const stock: RecentlyViewedStock = {
 *   ticker: '005930',
 *   market: 'kr',
 *   name: '삼성전자',
 *   viewedAt: '2024-01-15T10:30:00.000Z',
 * };
 * ```
 *
 * @extension
 * 추후 로그인 기능 완성 시 Supabase DB 연동을 위해
 * 서버 측 데이터 구조와 호환 가능하도록 설계되었습니다.
 */

// ==================== 시장 타입 ====================

/**
 * 시장 구분 타입 (최근 본 종목용)
 *
 * @property 'kr' - 한국 시장 (KOSPI, KOSDAQ)
 * @property 'us' - 미국 시장 (NYSE, NASDAQ, AMEX)
 * @property 'jp' - 일본 시장
 * @property 'hk' - 홍콩 시장
 *
 * @note market.ts의 MarketType과 구분하기 위해 별도 이름 사용
 *       market.ts MarketType = 'country' | 'global' (1차 탭용)
 *       recentlyViewed.ts RecentlyViewedMarket = 'kr' | 'us' | 'jp' | 'hk' (시장 구분용)
 */
export type RecentlyViewedMarket = 'kr' | 'us' | 'jp' | 'hk';

/**
 * @deprecated MarketType은 market.ts와 충돌. RecentlyViewedMarket 사용 권장
 */
export type MarketType = RecentlyViewedMarket;

// ==================== 최근 본 종목 인터페이스 ====================

/**
 * 최근 본 종목 아이템 인터페이스
 *
 * @description
 * 사용자가 방문한 종목 상세 페이지의 정보를 저장합니다.
 * localStorage에 JSON 형태로 저장되며, 최대 20개까지 유지됩니다.
 *
 * @example
 * ```typescript
 * const recentStock: RecentlyViewedStock = {
 *   ticker: 'AAPL',
 *   market: 'us',
 *   name: 'Apple Inc.',
 *   viewedAt: '2024-01-15T10:30:00.000Z',
 * };
 * ```
 */
export interface RecentlyViewedStock {
  /**
   * 종목 티커 (고유 식별자)
   *
   * @example
   * - 한국: '005930' (삼성전자), '000660' (SK하이닉스)
   * - 미국: 'AAPL' (Apple), 'TSLA' (Tesla)
   */
  ticker: string;

  /**
   * 시장 구분
   *
   * @example 'kr', 'us', 'jp', 'hk'
   */
  market: RecentlyViewedMarket;

  /**
   * 종목명 (사용자 표시용)
   *
   * @example '삼성전자', 'Apple Inc.'
   */
  name: string;

  /**
   * 마지막으로 본 시간 (ISO 8601 문자열)
   *
   * @description
   * 같은 종목을 다시 볼 경우 이 시간이 갱신됩니다.
   * 목록은 이 시간을 기준으로 내림차순 정렬됩니다.
   *
   * @example '2024-01-15T10:30:00.000Z'
   */
  viewedAt: string;
}

// ==================== 저장소 관련 타입 ====================

/**
 * localStorage에 저장되는 최근 본 종목 데이터 형식
 *
 * @description
 * localStorage의 'recentlyViewed' 키에 저장되는 데이터 형식입니다.
 * 배열 형태로 저장되며, 최신 항목이 배열의 맨 앞에 위치합니다.
 */
export type RecentlyViewedData = RecentlyViewedStock[];

// ==================== 훅 반환 타입 ====================

/**
 * useRecentlyViewed 훅 반환 타입
 *
 * @description
 * useRecentlyViewed 커스텀 훅이 반환하는 객체의 타입입니다.
 * 상태와 조작 함수들을 포함합니다.
 */
export interface UseRecentlyViewedReturn {
  /** 최근 본 종목 목록 (최신순 정렬) */
  recentlyViewed: RecentlyViewedStock[];

  /** 초기 로드 완료 여부 */
  isLoaded: boolean;

  /** 종목 추가 (중복 시 최신으로 갱신) */
  addToRecentlyViewed: (stock: Omit<RecentlyViewedStock, 'viewedAt'>) => void;

  /** 종목 제거 */
  removeFromRecentlyViewed: (ticker: string) => void;

  /** 전체 삭제 */
  clearRecentlyViewed: () => void;

  /** 최근 본 종목 개수 */
  count: number;
}

// ==================== 설정 상수 타입 ====================

/**
 * 최근 본 종목 설정
 *
 * @description
 * 최근 본 종목 기능의 설정값들을 정의합니다.
 * 추후 사용자 설정 기능 추가 시 확장 가능합니다.
 */
export interface RecentlyViewedConfig {
  /** localStorage 키 */
  storageKey: string;

  /** 최대 저장 개수 */
  maxItems: number;
}

/**
 * 기본 설정값
 */
export const DEFAULT_RECENTLY_VIEWED_CONFIG: RecentlyViewedConfig = {
  storageKey: 'recentlyViewed',
  maxItems: 20,
};
