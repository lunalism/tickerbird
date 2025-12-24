/**
 * 해외지수 시세 조회 API Route
 *
 * @route GET /api/kis/overseas/indices
 *
 * @description
 * 한국투자증권 Open API를 통해 미국 주요 지수(S&P500, NASDAQ, DOW JONES)의
 * 현재가를 조회합니다.
 *
 * 지수 API가 0을 반환하는 경우(CCMP, INDU) 해당 ETF 가격을 폴백으로 사용:
 * - NASDAQ(CCMP) → QQQ ETF (NASDAQ 100 추종)
 * - DOW JONES(INDU) → DIA ETF (다우존스 추종)
 *
 * 사용 예시:
 * - GET /api/kis/overseas/indices (모든 지수 조회)
 *
 * @see https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/overseas_stock/inquire_time_indexchartprice
 */

import { NextResponse } from 'next/server';
import { getOverseasIndexPrice, getOverseasStockPrice } from '@/lib/kis-api';
import type { OverseasIndexData, OverseasIndexCode, OverseasExchangeCode, KISApiErrorResponse } from '@/types/kis';

/**
 * 조회할 미국 주요 지수 목록
 */
const US_INDICES: OverseasIndexCode[] = ['SPX', 'CCMP', 'INDU'];

/**
 * 지수코드 → ETF 매핑 (폴백용)
 *
 * 한국투자증권 API가 지수값 0을 반환할 때 해당 ETF 가격을 사용하여 추정
 *
 * 배수 계산 방식:
 * - SPY: S&P 500 / 10 (SPY ≈ 690 → S&P 500 ≈ 6,900)
 * - QQQ: NASDAQ 100 / 35 (QQQ ≈ 620 → NASDAQ 100 ≈ 21,700)
 *   주의: QQQ는 NASDAQ Composite가 아닌 NASDAQ 100을 추종
 * - DIA: DOW JONES / 90 (DIA ≈ 487 → DOW ≈ 43,800)
 *
 * 이 값들은 ETF 가격과 실제 지수 값의 비율을 기반으로 산출됨
 */
const INDEX_TO_ETF_MAP: Record<OverseasIndexCode, {
  symbol: string;
  exchange: OverseasExchangeCode;
  multiplier: number;
  fallbackName: string;  // ETF 기준일 때 표시할 이름
}> = {
  'SPX': { symbol: 'SPY', exchange: 'AMS', multiplier: 10, fallbackName: 'S&P 500 (ETF 추정)' },
  'CCMP': { symbol: 'QQQ', exchange: 'NAS', multiplier: 35, fallbackName: 'NASDAQ 100 (ETF 추정)' },  // NASDAQ 100 기준
  'INDU': { symbol: 'DIA', exchange: 'AMS', multiplier: 90, fallbackName: 'DOW JONES (ETF 추정)' },
};

/**
 * API 응답 타입
 */
interface OverseasIndicesResponse {
  /** 조회된 지수 데이터 */
  data: OverseasIndexData[];
  /** 조회 실패한 지수 */
  failed: OverseasIndexCode[];
  /** 조회 시각 */
  timestamp: string;
}

/**
 * GET /api/kis/overseas/indices
 *
 * @returns 미국 주요 지수 시세 또는 에러
 */
/**
 * 지수 데이터 조회 (ETF 폴백 포함)
 *
 * 1. 먼저 지수 API로 조회
 * 2. 값이 0이면 해당 ETF 가격을 폴백으로 사용
 */
async function getIndexWithFallback(indexCode: OverseasIndexCode): Promise<OverseasIndexData> {
  // 1. 지수 API 호출
  const indexData = await getOverseasIndexPrice(indexCode);

  // 2. 값이 0이 아니면 정상 반환
  if (indexData.currentValue > 0) {
    return indexData;
  }

  // 3. 값이 0이면 ETF 가격을 폴백으로 사용
  const etfInfo = INDEX_TO_ETF_MAP[indexCode];
  console.log(`[API] ${indexCode} 지수값 0, ${etfInfo.symbol} ETF로 폴백 (배수: ${etfInfo.multiplier})`);

  try {
    const etfData = await getOverseasStockPrice(etfInfo.exchange, etfInfo.symbol);

    // ETF 가격에 배수를 곱해 대략적인 지수값 계산
    // 예: QQQ $620 × 35 = NASDAQ 100 21,700
    const estimatedIndexValue = etfData.currentPrice * etfInfo.multiplier;
    const estimatedChange = etfData.change * etfInfo.multiplier;

    console.log(`[API] ${etfInfo.symbol} ETF: $${etfData.currentPrice} × ${etfInfo.multiplier} = ${estimatedIndexValue.toFixed(2)}`);

    return {
      indexCode,
      // ETF 기반 추정치임을 명확히 표시
      indexName: etfInfo.fallbackName,
      currentValue: Math.round(estimatedIndexValue * 100) / 100,
      change: Math.round(estimatedChange * 100) / 100,
      changePercent: etfData.changePercent,
      changeSign: etfData.changeSign,
      timestamp: new Date().toISOString(),
    };
  } catch (etfError) {
    console.error(`[API] ${etfInfo.symbol} ETF 폴백도 실패:`, etfError);
    // ETF도 실패하면 원래 0 값 반환
    return indexData;
  }
}

export async function GET(): Promise<NextResponse<OverseasIndicesResponse | KISApiErrorResponse>> {
  try {
    console.log('[API /api/kis/overseas/indices] 미국 지수 조회 시작');

    // 모든 지수를 병렬로 조회 (ETF 폴백 포함)
    const results = await Promise.allSettled(
      US_INDICES.map(indexCode => getIndexWithFallback(indexCode))
    );

    // 성공/실패 분리
    const successfulData: OverseasIndexData[] = [];
    const failedIndices: OverseasIndexCode[] = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successfulData.push(result.value);
      } else {
        failedIndices.push(US_INDICES[index]);
        console.error(`[API] ${US_INDICES[index]} 조회 실패:`, result.reason);
      }
    });

    console.log(`[API] 조회 완료: 성공 ${successfulData.length}개, 실패 ${failedIndices.length}개`);

    return NextResponse.json({
      data: successfulData,
      failed: failedIndices,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[API /api/kis/overseas/indices] 에러:', error);

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
