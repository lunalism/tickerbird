/**
 * ETF 시세 일괄 조회 API Route
 *
 * @route GET /api/kis/etf/prices
 * @query category - ETF 카테고리 (선택: index, leverage, sector, overseas, bond, all)
 *
 * @description
 * 한국투자증권 Open API를 통해 여러 ETF의 현재가를 일괄 조회합니다.
 * ETF도 일반 주식과 동일한 시세 조회 API를 사용합니다 (FID_COND_MRKT_DIV_CODE: 'J')
 *
 * 사용 예시:
 * - GET /api/kis/etf/prices (전체 ETF 조회)
 * - GET /api/kis/etf/prices?category=index (지수 추종 ETF만 조회)
 * - GET /api/kis/etf/prices?category=sector (섹터/테마 ETF만 조회)
 *
 * Rate Limit 고려사항:
 * - 한국투자증권 API는 초당 20회 제한이 있음
 * - 28개 ETF를 병렬 조회하면 약 1.5초 소요 예상
 * - 요청 간 적절한 딜레이를 추가하여 안정성 확보
 *
 * @see https://apiportal.koreainvestment.com/apiservice/apiservice-domestic-stock-quotations
 */

import { NextRequest, NextResponse } from 'next/server';
import { getStockPrice } from '@/lib/kis-api';
import { koreanETFList, getETFsByCategory, KoreanETFInfo } from '@/constants';
import type { StockPriceData, KISApiErrorResponse } from '@/types/kis';

/**
 * ETF 시세 데이터 타입 (클라이언트용)
 *
 * StockPriceData를 기반으로 ETF 정보를 추가
 */
export interface ETFPriceData extends StockPriceData {
  /** ETF 이름 (한글) */
  name: string;
  /** ETF 카테고리 */
  category: KoreanETFInfo['category'];
  /** 운용사 */
  issuer: string;
}

/**
 * API 응답 타입
 */
interface ETFPricesResponse {
  /** 조회 성공한 ETF 목록 */
  data: ETFPriceData[];
  /** 조회 실패한 ETF 목록 (종목코드) */
  failed: string[];
  /** 조회 시각 */
  timestamp: string;
  /** 조회한 카테고리 */
  category: string;
}

/**
 * 단일 ETF 시세 조회 (에러 처리 포함)
 *
 * @param etfInfo - ETF 정보
 * @returns ETF 시세 데이터 또는 null (실패 시)
 */
async function fetchETFPrice(etfInfo: KoreanETFInfo): Promise<ETFPriceData | null> {
  try {
    // 한국투자증권 API로 시세 조회
    // ETF도 일반 주식과 동일한 API 사용 (FID_COND_MRKT_DIV_CODE: 'J')
    const priceData = await getStockPrice(etfInfo.symbol);

    // ETF 정보 추가하여 반환
    return {
      ...priceData,
      name: etfInfo.name,
      category: etfInfo.category,
      issuer: etfInfo.issuer,
    };
  } catch (error) {
    // 개별 ETF 조회 실패는 로그만 남기고 계속 진행
    console.error(`[ETF API] ${etfInfo.symbol} (${etfInfo.name}) 조회 실패:`, error);
    return null;
  }
}

/**
 * 배열을 청크로 분할
 *
 * @param array - 분할할 배열
 * @param size - 청크 크기
 * @returns 청크 배열
 */
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * 딜레이 함수
 *
 * @param ms - 대기 시간 (밀리초)
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * GET /api/kis/etf/prices
 *
 * @param request NextRequest 객체
 * @returns ETF 시세 목록 또는 에러
 */
export async function GET(request: NextRequest): Promise<NextResponse<ETFPricesResponse | KISApiErrorResponse>> {
  // 쿼리 파라미터에서 카테고리 추출
  const searchParams = request.nextUrl.searchParams;
  const category = searchParams.get('category') || 'all';

  try {
    // 카테고리에 따라 ETF 목록 필터링
    let targetETFs: KoreanETFInfo[];

    if (category === 'all') {
      targetETFs = koreanETFList;
    } else {
      // 유효한 카테고리인지 확인
      const validCategories = ['index', 'leverage', 'sector', 'overseas', 'bond'];
      if (!validCategories.includes(category)) {
        return NextResponse.json(
          {
            error: 'INVALID_CATEGORY',
            message: `유효하지 않은 카테고리입니다. 사용 가능: ${validCategories.join(', ')}, all`,
          },
          { status: 400 }
        );
      }
      targetETFs = getETFsByCategory(category as KoreanETFInfo['category']);
    }

    console.log(`[ETF API] ${category} 카테고리 ${targetETFs.length}개 ETF 조회 시작`);

    // ========== 병렬 조회 (Rate Limit 고려) ==========
    // 한국투자증권 API는 초당 20회 제한
    // 10개씩 청크로 나누어 병렬 조회 후 100ms 대기
    const results: (ETFPriceData | null)[] = [];
    const chunks = chunkArray(targetETFs, 10);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];

      // 청크 내 ETF 병렬 조회
      const chunkResults = await Promise.all(
        chunk.map(etf => fetchETFPrice(etf))
      );

      results.push(...chunkResults);

      // 마지막 청크가 아니면 딜레이 추가 (Rate Limit 방지)
      if (i < chunks.length - 1) {
        await delay(100);
      }
    }

    // 성공한 결과와 실패한 종목 분리
    const successfulData: ETFPriceData[] = [];
    const failedSymbols: string[] = [];

    results.forEach((result, index) => {
      if (result) {
        successfulData.push(result);
      } else {
        failedSymbols.push(targetETFs[index].symbol);
      }
    });

    console.log(`[ETF API] 조회 완료: 성공 ${successfulData.length}개, 실패 ${failedSymbols.length}개`);

    // 응답 반환
    return NextResponse.json({
      data: successfulData,
      failed: failedSymbols,
      timestamp: new Date().toISOString(),
      category,
    });
  } catch (error) {
    console.error('[API /api/kis/etf/prices] 에러:', error);

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
