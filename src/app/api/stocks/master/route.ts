/**
 * 종목 마스터 API
 *
 * 한국 및 미국 전체 종목 마스터 데이터를 조회합니다.
 * 데이터는 한국투자증권에서 제공하는 마스터 파일을 기반으로 합니다.
 *
 * @route GET /api/stocks/master
 * @query market - 시장 구분 ('all' | 'kr' | 'us')
 * @query refresh - 캐시 강제 갱신 ('true')
 *
 * @returns 종목 마스터 데이터
 *
 * 사용 예시:
 * - GET /api/stocks/master (전체 종목)
 * - GET /api/stocks/master?market=kr (한국 종목만)
 * - GET /api/stocks/master?market=us (미국 종목만)
 * - GET /api/stocks/master?refresh=true (캐시 강제 갱신)
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getKoreanStockMaster,
  getUSStockMaster,
  getAllStockMaster,
  getCacheStatus,
  type KoreanStockMaster,
  type USStockMaster,
} from '@/lib/stock-master';

/**
 * API 응답 타입
 */
interface StockMasterResponse {
  /** 성공 여부 */
  success: boolean;
  /** 한국 종목 (market='all' 또는 'kr'일 때) */
  korean?: KoreanStockMaster[];
  /** 미국 종목 (market='all' 또는 'us'일 때) */
  us?: USStockMaster[];
  /** 캐시 상태 */
  cache: {
    korean: { exists: boolean; expiresAt: string | null; count: number };
    us: { exists: boolean; expiresAt: string | null; count: number };
  };
  /** 조회 시간 */
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

/**
 * GET /api/stocks/master
 *
 * 종목 마스터 데이터 조회
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse<StockMasterResponse | ErrorResponse>> {
  const searchParams = request.nextUrl.searchParams;
  const market = searchParams.get('market') || 'all';
  const refresh = searchParams.get('refresh') === 'true';

  try {
    let korean: KoreanStockMaster[] | undefined;
    let us: USStockMaster[] | undefined;

    // 시장 구분에 따라 조회
    switch (market) {
      case 'kr':
        korean = await getKoreanStockMaster(refresh);
        break;
      case 'us':
        us = await getUSStockMaster(refresh);
        break;
      case 'all':
      default:
        const all = await getAllStockMaster(refresh);
        korean = all.korean;
        us = all.us;
        break;
    }

    // 캐시 상태 조회
    const cache = getCacheStatus();

    const response: StockMasterResponse = {
      success: true,
      ...(korean && { korean }),
      ...(us && { us }),
      cache,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[API /api/stocks/master] 에러:', error);

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
