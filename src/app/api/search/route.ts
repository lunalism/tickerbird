/**
 * 통합 검색 API
 *
 * 종목 마스터 데이터에서 종목을 검색합니다.
 * 종목명, 티커/종목코드로 부분 일치 검색을 수행합니다.
 *
 * @route GET /api/search
 * @query q - 검색어 (필수)
 * @query market - 시장 구분 ('all' | 'kr' | 'us'), 기본값: 'all'
 * @query limit - 최대 결과 개수, 기본값: 50
 *
 * @returns 검색 결과
 *
 * 사용 예시:
 * - GET /api/search?q=삼성 (삼성 관련 종목 검색)
 * - GET /api/search?q=AAPL (Apple 검색)
 * - GET /api/search?q=팔란티어&market=us (미국에서만 검색)
 * - GET /api/search?q=테슬라&limit=10 (최대 10개 결과)
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getKoreanStockMaster,
  getUSStockMaster,
  type KoreanStockMaster,
  type USStockMaster,
} from '@/lib/stock-master';

// ==================== 타입 정의 ====================

/**
 * 검색 결과 아이템 (한국 종목)
 */
interface KoreanSearchResult {
  type: 'kr';
  symbol: string;
  name: string;
  market: 'KOSPI' | 'KOSDAQ';
}

/**
 * 검색 결과 아이템 (미국 종목)
 */
interface USSearchResult {
  type: 'us';
  symbol: string;
  name: string;
  /** 한글 종목명 (종목 마스터에서 제공, 없으면 undefined) */
  nameKr?: string;
  exchange: 'NASDAQ' | 'NYSE' | 'AMEX';
}

/**
 * 통합 검색 결과
 */
type SearchResult = KoreanSearchResult | USSearchResult;

/**
 * API 응답 타입
 */
interface SearchResponse {
  success: boolean;
  query: string;
  results: SearchResult[];
  totalCount: number;
  timestamp: string;
}

/**
 * 에러 응답 타입
 */
interface ErrorResponse {
  success: boolean;
  error: string;
  message: string;
}

// ==================== 검색 유틸리티 ====================

/**
 * 한국 종목 검색
 *
 * 종목코드, 종목명에서 검색합니다.
 *
 * @param stocks 한국 종목 목록
 * @param query 검색어
 * @param limit 최대 결과 개수
 * @returns 검색 결과
 */
function searchKoreanStocks(
  stocks: KoreanStockMaster[],
  query: string,
  limit: number
): KoreanSearchResult[] {
  const results: KoreanSearchResult[] = [];
  const lowerQuery = query.toLowerCase();

  for (const stock of stocks) {
    // 종목코드 또는 종목명이 검색어와 일치하는지 확인
    const symbolMatch = stock.symbol.toLowerCase().includes(lowerQuery);
    const nameMatch = stock.name.toLowerCase().includes(lowerQuery);

    if (symbolMatch || nameMatch) {
      results.push({
        type: 'kr',
        symbol: stock.symbol,
        name: stock.name,
        market: stock.market,
      });

      // 최대 개수 도달 시 중단
      if (results.length >= limit) break;
    }
  }

  return results;
}

/**
 * 미국 종목 검색
 *
 * 티커 심볼, 종목명에서 검색합니다.
 *
 * @param stocks 미국 종목 목록
 * @param query 검색어
 * @param limit 최대 결과 개수
 * @returns 검색 결과
 */
function searchUSStocks(
  stocks: USStockMaster[],
  query: string,
  limit: number
): USSearchResult[] {
  const results: USSearchResult[] = [];
  const lowerQuery = query.toLowerCase();

  for (const stock of stocks) {
    // 티커 또는 종목명이 검색어와 일치하는지 확인
    const symbolMatch = stock.symbol.toLowerCase().includes(lowerQuery);
    const nameMatch = stock.name.toLowerCase().includes(lowerQuery);
    const nameKrMatch = stock.nameKr
      ? stock.nameKr.toLowerCase().includes(lowerQuery)
      : false;

    if (symbolMatch || nameMatch || nameKrMatch) {
      results.push({
        type: 'us',
        symbol: stock.symbol,
        name: stock.name,
        nameKr: stock.nameKr,  // 한글명 추가 (종목 마스터에서 제공)
        exchange: stock.exchange,
      });

      // 최대 개수 도달 시 중단
      if (results.length >= limit) break;
    }
  }

  return results;
}

/**
 * 검색 결과 정렬
 *
 * 정확도 순으로 정렬합니다:
 * 1. 심볼이 검색어로 시작하는 경우 우선
 * 2. 종목명이 검색어로 시작하는 경우 그 다음
 * 3. 나머지는 심볼 알파벳 순
 *
 * @param results 검색 결과
 * @param query 검색어
 * @returns 정렬된 검색 결과
 */
function sortResults(results: SearchResult[], query: string): SearchResult[] {
  const lowerQuery = query.toLowerCase();

  return results.sort((a, b) => {
    // 심볼이 검색어로 시작하는지 확인
    const aStartsWithSymbol = a.symbol.toLowerCase().startsWith(lowerQuery);
    const bStartsWithSymbol = b.symbol.toLowerCase().startsWith(lowerQuery);

    if (aStartsWithSymbol && !bStartsWithSymbol) return -1;
    if (!aStartsWithSymbol && bStartsWithSymbol) return 1;

    // 종목명이 검색어로 시작하는지 확인
    const aStartsWithName = a.name.toLowerCase().startsWith(lowerQuery);
    const bStartsWithName = b.name.toLowerCase().startsWith(lowerQuery);

    if (aStartsWithName && !bStartsWithName) return -1;
    if (!aStartsWithName && bStartsWithName) return 1;

    // 심볼 알파벳 순
    return a.symbol.localeCompare(b.symbol);
  });
}

// ==================== API 핸들러 ====================

/**
 * GET /api/search
 *
 * 종목 검색
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse<SearchResponse | ErrorResponse>> {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');
  const market = searchParams.get('market') || 'all';
  const limit = parseInt(searchParams.get('limit') || '50', 10);

  // 검색어 유효성 검사
  if (!query || query.trim() === '') {
    return NextResponse.json(
      {
        success: false,
        error: 'MISSING_QUERY',
        message: '검색어(q)를 입력해주세요. 예: ?q=삼성',
      },
      { status: 400 }
    );
  }

  const trimmedQuery = query.trim();

  try {
    const results: SearchResult[] = [];

    // 한국 종목 검색
    if (market === 'all' || market === 'kr') {
      const koreanStocks = await getKoreanStockMaster();
      const koreanResults = searchKoreanStocks(koreanStocks, trimmedQuery, limit);
      results.push(...koreanResults);
    }

    // 미국 종목 검색
    if (market === 'all' || market === 'us') {
      const usStocks = await getUSStockMaster();
      const usResults = searchUSStocks(usStocks, trimmedQuery, limit);
      results.push(...usResults);
    }

    // 정렬 및 최종 제한
    const sortedResults = sortResults(results, trimmedQuery).slice(0, limit);

    const response: SearchResponse = {
      success: true,
      query: trimmedQuery,
      results: sortedResults,
      totalCount: sortedResults.length,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[API /api/search] 에러:', error);

    const errorMessage =
      error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';

    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: errorMessage,
      },
      { status: 500 }
    );
  }
}
