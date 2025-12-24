/**
 * 지수(업종) 현재가 조회 API Route
 *
 * @route GET /api/kis/index/price
 * @query indexCode - 지수코드
 *   - 0001: 코스피 (KOSPI)
 *   - 1001: 코스닥 (KOSDAQ)
 *   - 2001: 코스피200
 *   - 3003: KRX300
 *
 * @description
 * 한국투자증권 Open API를 통해 국내 주가지수 현재가를 조회합니다.
 *
 * 사용 예시:
 * - GET /api/kis/index/price?indexCode=0001 (코스피)
 * - GET /api/kis/index/price?indexCode=1001 (코스닥)
 *
 * @see https://apiportal.koreainvestment.com/apiservice/apiservice-domestic-stock-quotations
 */

import { NextRequest, NextResponse } from 'next/server';
import { getIndexPrice } from '@/lib/kis-api';
import type { IndexPriceData, KISApiErrorResponse } from '@/types/kis';

/**
 * 유효한 지수코드 목록
 * 한국투자증권 API에서 지원하는 업종코드
 */
const VALID_INDEX_CODES: Record<string, string> = {
  '0001': '코스피',
  '1001': '코스닥',
  '2001': '코스피200',
  '3003': 'KRX300',
};

/**
 * GET /api/kis/index/price
 *
 * @param request NextRequest 객체
 * @returns 지수 현재가 정보 또는 에러
 */
export async function GET(request: NextRequest): Promise<NextResponse<IndexPriceData | KISApiErrorResponse>> {
  // 쿼리 파라미터에서 지수코드 추출
  const searchParams = request.nextUrl.searchParams;
  const indexCode = searchParams.get('indexCode');

  // 지수코드 유효성 검사
  if (!indexCode) {
    return NextResponse.json(
      {
        error: 'MISSING_INDEX_CODE',
        message: `지수코드(indexCode)를 입력해주세요. 지원 코드: ${Object.entries(VALID_INDEX_CODES)
          .map(([code, name]) => `${code}(${name})`)
          .join(', ')}`,
      },
      { status: 400 }
    );
  }

  // 지수코드 형식 검사
  if (!VALID_INDEX_CODES[indexCode]) {
    return NextResponse.json(
      {
        error: 'INVALID_INDEX_CODE',
        message: `유효하지 않은 지수코드입니다. 지원 코드: ${Object.entries(VALID_INDEX_CODES)
          .map(([code, name]) => `${code}(${name})`)
          .join(', ')}`,
      },
      { status: 400 }
    );
  }

  try {
    // 한국투자증권 API 호출
    const indexPrice = await getIndexPrice(indexCode);

    // 성공 응답
    return NextResponse.json(indexPrice);
  } catch (error) {
    console.error('[API /api/kis/index/price] 에러:', error);

    // 에러 메시지 추출
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';

    // API 키 미설정 에러
    if (errorMessage.includes('API 키가 설정되지 않았습니다')) {
      return NextResponse.json(
        {
          error: 'API_KEY_NOT_CONFIGURED',
          message: errorMessage,
        },
        { status: 500 }
      );
    }

    // 인증 에러
    if (errorMessage.includes('인증') || errorMessage.includes('토큰')) {
      return NextResponse.json(
        {
          error: 'AUTHENTICATION_ERROR',
          message: errorMessage,
        },
        { status: 401 }
      );
    }

    // 한국투자증권 API 에러
    if (errorMessage.includes('API 에러')) {
      return NextResponse.json(
        {
          error: 'KIS_API_ERROR',
          message: errorMessage,
        },
        { status: 502 }
      );
    }

    // 기타 에러
    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message: errorMessage,
      },
      { status: 500 }
    );
  }
}
