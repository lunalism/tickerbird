/**
 * 검색 로그 관리 라이브러리
 *
 * Firestore를 사용하여 검색 로그를 저장하고 인기 검색어를 집계합니다.
 *
 * 컬렉션 구조:
 * - searchLogs: 개별 검색 로그 저장
 * - popularSearches: 집계된 인기 검색어 (캐시용)
 *
 * 사용법:
 * import { logSearch, getPopularSearches } from '@/lib/searchLog';
 *
 * // 검색 로그 저장
 * await logSearch('삼성전자', 'stock', userId);
 *
 * // 인기 검색어 조회
 * const popular = await getPopularSearches();
 */

import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  doc,
  getDoc,
  setDoc,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';

// ==================== 타입 정의 ====================

/**
 * 검색 유형
 */
export type SearchType = 'stock' | 'news' | 'term' | 'all';

/**
 * 검색 로그 문서 타입
 */
export interface SearchLog {
  /** 검색어 (정규화된 소문자) */
  query: string;
  /** 원본 검색어 (대소문자 유지) */
  originalQuery: string;
  /** 사용자 ID (로그인한 경우) */
  userId?: string;
  /** 검색 시간 */
  timestamp: Timestamp;
  /** 검색 유형 */
  type: SearchType;
}

/**
 * 인기 검색어 항목 타입
 */
export interface PopularSearchItem {
  /** 검색어 */
  query: string;
  /** 검색 횟수 */
  count: number;
}

/**
 * 인기 검색어 캐시 문서 타입
 */
interface PopularSearchCache {
  /** 인기 검색어 목록 */
  searches: PopularSearchItem[];
  /** 집계 기간 (일) */
  periodDays: number;
  /** 마지막 업데이트 시간 */
  updatedAt: Timestamp;
}

// ==================== 상수 ====================

/** 검색 로그 컬렉션 이름 */
const SEARCH_LOGS_COLLECTION = 'searchLogs';

/** 인기 검색어 캐시 컬렉션 이름 */
const POPULAR_CACHE_COLLECTION = 'popularSearches';

/** 인기 검색어 캐시 문서 ID */
const POPULAR_CACHE_DOC_ID = 'weekly';

/** 캐시 유효 시간 (1시간, 밀리초) */
const CACHE_TTL_MS = 60 * 60 * 1000;

/** 중복 검색 무시 시간 (1분, 밀리초) */
const DUPLICATE_IGNORE_MS = 60 * 1000;

/** 인기 검색어 집계 기간 (7일) */
const AGGREGATION_PERIOD_DAYS = 7;

/** 인기 검색어 최대 개수 */
const MAX_POPULAR_SEARCHES = 10;

// ==================== 내부 유틸 ====================

/** 마지막 검색 시간 캐시 (클라이언트 사이드 중복 방지) */
const lastSearchCache = new Map<string, number>();

/**
 * 검색어 정규화 (소문자 변환, 공백 정리)
 */
function normalizeQuery(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * 중복 검색 체크 (같은 검색어 1분 내 재검색)
 */
function isDuplicateSearch(normalizedQuery: string, userId?: string): boolean {
  const cacheKey = `${normalizedQuery}:${userId || 'anonymous'}`;
  const lastTime = lastSearchCache.get(cacheKey);
  const now = Date.now();

  if (lastTime && now - lastTime < DUPLICATE_IGNORE_MS) {
    return true;
  }

  // 캐시 업데이트
  lastSearchCache.set(cacheKey, now);

  // 캐시 정리 (100개 초과 시 오래된 항목 삭제)
  if (lastSearchCache.size > 100) {
    const entries = Array.from(lastSearchCache.entries());
    entries.sort((a, b) => a[1] - b[1]);
    entries.slice(0, 50).forEach(([key]) => lastSearchCache.delete(key));
  }

  return false;
}

// ==================== 공개 함수 ====================

/**
 * 검색 로그 저장
 *
 * 사용자가 검색할 때마다 호출하여 Firestore에 로그를 저장합니다.
 * 중복 검색(같은 검색어 1분 내 재검색)은 무시됩니다.
 *
 * @param query 검색어
 * @param type 검색 유형 (stock, news, term, all)
 * @param userId 사용자 ID (선택)
 * @returns 저장 성공 여부
 *
 * @example
 * // 종목 검색 로그 저장
 * await logSearch('삼성전자', 'stock', user?.uid);
 *
 * // 전체 검색 로그 저장
 * await logSearch('NVIDIA', 'all');
 */
export async function logSearch(
  query: string,
  type: SearchType = 'all',
  userId?: string
): Promise<boolean> {
  try {
    const originalQuery = query.trim();
    const normalizedQuery = normalizeQuery(originalQuery);

    // 빈 검색어 무시
    if (!normalizedQuery) {
      return false;
    }

    // 중복 검색 무시 (클라이언트 사이드)
    if (isDuplicateSearch(normalizedQuery, userId)) {
      console.log('[SearchLog] 중복 검색 무시:', normalizedQuery);
      return false;
    }

    // Firestore에 로그 저장
    const logData: Omit<SearchLog, 'timestamp'> & { timestamp: ReturnType<typeof serverTimestamp> } = {
      query: normalizedQuery,
      originalQuery,
      type,
      timestamp: serverTimestamp(),
    };

    // 로그인 사용자인 경우 userId 추가
    if (userId) {
      (logData as SearchLog).userId = userId;
    }

    await addDoc(collection(db, SEARCH_LOGS_COLLECTION), logData);
    console.log('[SearchLog] 저장 성공:', normalizedQuery);
    return true;
  } catch (error) {
    console.error('[SearchLog] 저장 실패:', error);
    return false;
  }
}

/**
 * 인기 검색어 조회
 *
 * 캐시된 인기 검색어를 반환합니다.
 * 캐시가 만료되었거나 없으면 실시간 집계합니다.
 *
 * @param forceRefresh 강제 새로고침 여부
 * @returns 인기 검색어 목록
 *
 * @example
 * const popularSearches = await getPopularSearches();
 * // [{ query: '삼성전자', count: 150 }, { query: 'NVIDIA', count: 120 }, ...]
 */
export async function getPopularSearches(
  forceRefresh = false
): Promise<PopularSearchItem[]> {
  try {
    // 1. 캐시 확인 (강제 새로고침이 아닌 경우)
    if (!forceRefresh) {
      const cacheDoc = await getDoc(
        doc(db, POPULAR_CACHE_COLLECTION, POPULAR_CACHE_DOC_ID)
      );

      if (cacheDoc.exists()) {
        const cacheData = cacheDoc.data() as PopularSearchCache;
        const cacheAge = Date.now() - cacheData.updatedAt.toMillis();

        // 캐시가 유효한 경우 반환
        if (cacheAge < CACHE_TTL_MS) {
          console.log('[PopularSearches] 캐시 사용 (나이:', Math.round(cacheAge / 1000), '초)');
          return cacheData.searches;
        }
      }
    }

    // 2. 실시간 집계
    console.log('[PopularSearches] 실시간 집계 시작...');
    const aggregatedSearches = await aggregatePopularSearches();

    // 3. 캐시 업데이트
    await updatePopularSearchCache(aggregatedSearches);

    return aggregatedSearches;
  } catch (error) {
    console.error('[PopularSearches] 조회 실패:', error);

    // 에러 시 기본값 반환 (하드코딩된 검색어)
    return [
      { query: '삼성전자', count: 0 },
      { query: 'NVIDIA', count: 0 },
      { query: '테슬라', count: 0 },
      { query: 'CPI', count: 0 },
      { query: 'FOMC', count: 0 },
      { query: '금리', count: 0 },
    ];
  }
}

/**
 * 인기 검색어 실시간 집계
 *
 * 최근 N일간의 검색 로그를 집계하여 인기 검색어를 계산합니다.
 *
 * @returns 집계된 인기 검색어 목록
 */
async function aggregatePopularSearches(): Promise<PopularSearchItem[]> {
  // 집계 기간 시작 시점 계산
  const periodStart = new Date();
  periodStart.setDate(periodStart.getDate() - AGGREGATION_PERIOD_DAYS);

  // 검색 로그 쿼리
  const logsQuery = query(
    collection(db, SEARCH_LOGS_COLLECTION),
    where('timestamp', '>=', Timestamp.fromDate(periodStart)),
    orderBy('timestamp', 'desc'),
    limit(10000) // 최대 10,000개 로그 조회
  );

  const snapshot = await getDocs(logsQuery);

  // 검색어별 카운트 집계
  const countMap = new Map<string, { query: string; count: number }>();

  snapshot.forEach((doc) => {
    const data = doc.data() as SearchLog;
    const normalizedQuery = data.query;
    const originalQuery = data.originalQuery || normalizedQuery;

    if (countMap.has(normalizedQuery)) {
      countMap.get(normalizedQuery)!.count++;
    } else {
      // 원본 검색어 중 가장 흔한 형태 사용 (첫 번째 것 사용)
      countMap.set(normalizedQuery, {
        query: originalQuery,
        count: 1,
      });
    }
  });

  // 카운트 기준 내림차순 정렬
  const sorted = Array.from(countMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, MAX_POPULAR_SEARCHES);

  console.log('[PopularSearches] 집계 완료:', sorted.length, '개');
  return sorted;
}

/**
 * 인기 검색어 캐시 업데이트
 */
async function updatePopularSearchCache(
  searches: PopularSearchItem[]
): Promise<void> {
  try {
    const cacheData: PopularSearchCache = {
      searches,
      periodDays: AGGREGATION_PERIOD_DAYS,
      updatedAt: Timestamp.now(),
    };

    await setDoc(
      doc(db, POPULAR_CACHE_COLLECTION, POPULAR_CACHE_DOC_ID),
      cacheData
    );

    console.log('[PopularSearches] 캐시 업데이트 완료');
  } catch (error) {
    console.error('[PopularSearches] 캐시 업데이트 실패:', error);
  }
}
