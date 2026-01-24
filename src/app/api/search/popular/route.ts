/**
 * 인기 검색어 API
 *
 * @route GET /api/search/popular
 *
 * @description
 * 최근 7일간 가장 많이 검색된 검색어를 반환합니다.
 * Firestore에 캐시된 데이터를 사용하며, 1시간마다 자동 갱신됩니다.
 *
 * @query refresh - 강제 새로고침 여부 (true/false)
 *
 * @returns {Object} 인기 검색어 목록
 * - success: 성공 여부
 * - searches: 인기 검색어 배열 [{ query: string, count: number }]
 * - cached: 캐시 사용 여부
 * - timestamp: 응답 시간
 *
 * @example
 * // 기본 조회
 * GET /api/search/popular
 *
 * // 강제 새로고침
 * GET /api/search/popular?refresh=true
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

// ==================== 타입 정의 ====================

interface PopularSearchItem {
  query: string;
  count: number;
}

interface PopularSearchCache {
  searches: PopularSearchItem[];
  periodDays: number;
  updatedAt: Timestamp;
}

interface SearchLog {
  query: string;
  originalQuery: string;
  timestamp: Timestamp;
}

// ==================== 상수 ====================

/** 인기 검색어 캐시 컬렉션 이름 */
const POPULAR_CACHE_COLLECTION = 'popularSearches';

/** 검색 로그 컬렉션 이름 */
const SEARCH_LOGS_COLLECTION = 'searchLogs';

/** 캐시 문서 ID */
const CACHE_DOC_ID = 'weekly';

/** 캐시 유효 시간 (1시간) */
const CACHE_TTL_MS = 60 * 60 * 1000;

/** 집계 기간 (7일) */
const AGGREGATION_PERIOD_DAYS = 7;

/** 최대 반환 개수 */
const MAX_RESULTS = 10;

/** 기본 인기 검색어 (데이터 없을 때) */
const DEFAULT_SEARCHES: PopularSearchItem[] = [
  { query: '삼성전자', count: 0 },
  { query: 'NVIDIA', count: 0 },
  { query: '테슬라', count: 0 },
  { query: 'CPI', count: 0 },
  { query: 'FOMC', count: 0 },
  { query: '금리', count: 0 },
];

// ==================== API 핸들러 ====================

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const forceRefresh = searchParams.get('refresh') === 'true';

  try {
    let searches: PopularSearchItem[];
    let cached = false;

    // 1. 캐시 확인 (강제 새로고침이 아닌 경우)
    if (!forceRefresh) {
      const cacheResult = await getCachedPopularSearches();
      if (cacheResult) {
        searches = cacheResult;
        cached = true;
      } else {
        // 캐시 없거나 만료 → 집계
        searches = await aggregateAndCache();
      }
    } else {
      // 강제 새로고침 → 집계
      searches = await aggregateAndCache();
    }

    return NextResponse.json({
      success: true,
      searches,
      cached,
      count: searches.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[PopularSearches API] 에러:', error);

    // 에러 시 기본값 반환
    return NextResponse.json({
      success: true,
      searches: DEFAULT_SEARCHES,
      cached: false,
      error: '집계 중 오류 발생, 기본값 반환',
      timestamp: new Date().toISOString(),
    });
  }
}

// ==================== 내부 함수 ====================

/**
 * 캐시된 인기 검색어 조회
 * 캐시가 유효하면 반환, 만료 또는 없으면 null 반환
 */
async function getCachedPopularSearches(): Promise<PopularSearchItem[] | null> {
  try {
    const cacheDoc = await getDoc(
      doc(db, POPULAR_CACHE_COLLECTION, CACHE_DOC_ID)
    );

    if (!cacheDoc.exists()) {
      return null;
    }

    const cacheData = cacheDoc.data() as PopularSearchCache;
    const cacheAge = Date.now() - cacheData.updatedAt.toMillis();

    // 캐시 만료 확인
    if (cacheAge >= CACHE_TTL_MS) {
      console.log('[PopularSearches API] 캐시 만료');
      return null;
    }

    console.log('[PopularSearches API] 캐시 사용 (나이:', Math.round(cacheAge / 1000), '초)');
    return cacheData.searches;
  } catch (error) {
    console.error('[PopularSearches API] 캐시 조회 실패:', error);
    return null;
  }
}

/**
 * 인기 검색어 집계 및 캐시 업데이트
 */
async function aggregateAndCache(): Promise<PopularSearchItem[]> {
  console.log('[PopularSearches API] 실시간 집계 시작...');

  // 집계 기간 시작 시점
  const periodStart = new Date();
  periodStart.setDate(periodStart.getDate() - AGGREGATION_PERIOD_DAYS);

  try {
    // 검색 로그 쿼리
    const logsQuery = query(
      collection(db, SEARCH_LOGS_COLLECTION),
      where('timestamp', '>=', Timestamp.fromDate(periodStart)),
      orderBy('timestamp', 'desc'),
      limit(10000)
    );

    const snapshot = await getDocs(logsQuery);

    // 로그가 없으면 기본값 반환
    if (snapshot.empty) {
      console.log('[PopularSearches API] 로그 없음, 기본값 반환');
      return DEFAULT_SEARCHES;
    }

    // 검색어별 카운트 집계
    const countMap = new Map<string, { query: string; count: number }>();

    snapshot.forEach((doc) => {
      const data = doc.data() as SearchLog;
      const normalizedQuery = data.query;
      const originalQuery = data.originalQuery || normalizedQuery;

      if (countMap.has(normalizedQuery)) {
        countMap.get(normalizedQuery)!.count++;
      } else {
        countMap.set(normalizedQuery, {
          query: originalQuery,
          count: 1,
        });
      }
    });

    // 정렬 및 상위 N개 추출
    const sorted = Array.from(countMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, MAX_RESULTS);

    console.log('[PopularSearches API] 집계 완료:', sorted.length, '개');

    // 결과가 너무 적으면 기본값과 병합
    let finalSearches = sorted;
    if (sorted.length < 6) {
      const existingQueries = new Set(sorted.map((s) => s.query.toLowerCase()));
      const additionalDefaults = DEFAULT_SEARCHES.filter(
        (d) => !existingQueries.has(d.query.toLowerCase())
      );
      finalSearches = [...sorted, ...additionalDefaults].slice(0, MAX_RESULTS);
    }

    // 캐시 업데이트
    await updateCache(finalSearches);

    return finalSearches;
  } catch (error) {
    console.error('[PopularSearches API] 집계 실패:', error);
    return DEFAULT_SEARCHES;
  }
}

/**
 * 캐시 업데이트
 */
async function updateCache(searches: PopularSearchItem[]): Promise<void> {
  try {
    const cacheData: PopularSearchCache = {
      searches,
      periodDays: AGGREGATION_PERIOD_DAYS,
      updatedAt: Timestamp.now(),
    };

    await setDoc(doc(db, POPULAR_CACHE_COLLECTION, CACHE_DOC_ID), cacheData);
    console.log('[PopularSearches API] 캐시 업데이트 완료');
  } catch (error) {
    console.error('[PopularSearches API] 캐시 업데이트 실패:', error);
  }
}
