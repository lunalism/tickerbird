/**
 * 주식 현재가 조회 API Route
 *
 * @route GET /api/kis/stock/price
 * @query symbol - 종목코드 (6자리, 예: 005930 삼성전자)
 *
 * @description
 * 한국투자증권 Open API를 통해 국내주식 현재가를 조회합니다.
 *
 * 사용 예시:
 * - GET /api/kis/stock/price?symbol=005930 (삼성전자)
 * - GET /api/kis/stock/price?symbol=000660 (SK하이닉스)
 * - GET /api/kis/stock/price?symbol=035720 (카카오)
 *
 * @see https://apiportal.koreainvestment.com/apiservice/apiservice-domestic-stock-quotations
 */

import { NextRequest, NextResponse } from 'next/server';
import { getStockPrice } from '@/lib/kis-api';
import type { StockPriceData, KISApiErrorResponse } from '@/types/kis';

/**
 * GET /api/kis/stock/price
 *
 * @param request NextRequest 객체
 * @returns 주식 현재가 정보 또는 에러
 */
export async function GET(request: NextRequest): Promise<NextResponse<StockPriceData | KISApiErrorResponse>> {
  // 쿼리 파라미터에서 종목코드 추출
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get('symbol');

  // 종목코드 유효성 검사
  if (!symbol) {
    return NextResponse.json(
      {
        error: 'MISSING_SYMBOL',
        message: '종목코드(symbol)를 입력해주세요. 예: ?symbol=005930',
      },
      { status: 400 }
    );
  }

  // 종목코드 형식 검사 (6자리 숫자)
  if (!/^\d{6}$/.test(symbol)) {
    return NextResponse.json(
      {
        error: 'INVALID_SYMBOL',
        message: '종목코드는 6자리 숫자여야 합니다. 예: 005930',
      },
      { status: 400 }
    );
  }

  try {
    // 한국투자증권 API 호출
    const stockPrice = await getStockPrice(symbol);

    // 성공 응답
    return NextResponse.json(stockPrice);
  } catch (error) {
    console.error('[API /api/kis/stock/price] 에러:', error);

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
