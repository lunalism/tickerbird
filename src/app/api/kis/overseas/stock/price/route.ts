/**
 * 미국 주식 개별 시세 조회 API Route
 *
 * @route GET /api/kis/overseas/stock/price
 * @query symbol - 종목 심볼 (필수: AAPL, MSFT, GOOGL 등)
 *
 * @description
 * 한국투자증권 Open API를 통해 미국 개별 주식의 현재가를 조회합니다.
 * 관심종목 페이지에서 미국 주식 시세 표시에 사용됩니다.
 *
 * 종목명 조회 우선순위:
 * 1. usStockList 상수에서 조회 (자주 사용되는 인기 종목)
 * 2. 종목 마스터 캐시에서 조회 (전체 미국 종목 11,000+)
 * 3. 티커 심볼을 그대로 사용 (fallback)
 *
 * 사용 예시:
 * - GET /api/kis/overseas/stock/price?symbol=AAPL
 * - GET /api/kis/overseas/stock/price?symbol=MSFT
 */

import { NextRequest, NextResponse } from 'next/server';
import { getOverseasStockPrice } from '@/lib/kis-api';
import { usStockList } from '@/constants';
import { getUSStockMaster, type USStockMaster } from '@/lib/stock-master';
import type { OverseasExchangeCode, KISApiErrorResponse } from '@/types/kis';

/**
 * API 응답 타입
 */
interface USStockPriceResponse {
  /** 종목 심볼 */
  symbol: string;
  /** 회사명 (영문) */
  name: string;
  /** 회사명 (한글, 있는 경우) */
  nameKr?: string;
  /** 거래소 코드 */
  exchange: string;
  /** 현재가 (USD) */
  currentPrice: number;
  /** 전일 대비 변동폭 */
  change: number;
  /** 전일 대비 변동률 (%) */
  changePercent: number;
  /** 거래량 */
  volume: number;
  /** 조회 시각 */
  timestamp: string;
}

/**
 * GET /api/kis/overseas/stock/price
 */
export async function GET(request: NextRequest): Promise<NextResponse<USStockPriceResponse | KISApiErrorResponse>> {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get('symbol')?.toUpperCase();

  if (!symbol) {
    return NextResponse.json(
      {
        error: 'MISSING_SYMBOL',
        message: '종목 심볼(symbol)이 필요합니다.',
      },
      { status: 400 }
    );
  }

  try {
    /**
     * 종목 정보 조회 (이름, 거래소)
     *
     * 조회 순서:
     * 1. usStockList 상수 (자주 사용되는 인기 종목, 빠른 조회)
     * 2. 종목 마스터 캐시 (전체 미국 종목 11,000+, 디스크 캐시)
     * 3. fallback: 티커를 이름으로 사용
     */

    // 1단계: usStockList 상수에서 종목 정보 찾기 (메모리, 빠름)
    const stockInfo = usStockList.find(stock => stock.symbol === symbol);

    // 종목명과 거래소 초기값 (fallback 값으로 시작)
    let name = symbol;  // 기본값: 티커 심볼
    let nameKr: string | undefined = undefined;  // 한글명 (종목 마스터에서 조회)
    let exchange: OverseasExchangeCode = 'NAS';  // 기본값: NASDAQ

    if (stockInfo) {
      // usStockList에서 찾은 경우 - 인기 종목
      name = stockInfo.name;
      exchange = stockInfo.exchange;
      console.log(`[US Stock Price API] ${symbol} - usStockList에서 조회: ${name}`);

      // usStockList에는 한글명이 없으므로 종목 마스터에서 한글명만 추가 조회
      try {
        const usMaster = await getUSStockMaster();
        const masterStock = usMaster.find((stock: USStockMaster) => stock.symbol === symbol);
        if (masterStock?.nameKr) {
          nameKr = masterStock.nameKr;
          console.log(`[US Stock Price API] ${symbol} - 한글명: ${nameKr}`);
        }
      } catch {
        // 한글명 조회 실패 시 무시
      }
    } else {
      // 2단계: 종목 마스터 캐시에서 종목 정보 찾기 (디스크 캐시)
      try {
        const usMaster = await getUSStockMaster();
        const masterStock = usMaster.find((stock: USStockMaster) => stock.symbol === symbol);

        if (masterStock) {
          // 종목 마스터에서 찾은 경우
          name = masterStock.name;
          nameKr = masterStock.nameKr;  // 한글명도 함께 가져옴
          // 거래소 코드 변환 (NASDAQ → NAS, NYSE → NYS, AMEX → AMS)
          exchange = masterStock.exchange === 'NASDAQ' ? 'NAS'
            : masterStock.exchange === 'NYSE' ? 'NYS'
            : 'AMS';
          console.log(`[US Stock Price API] ${symbol} - 종목 마스터에서 조회: ${name} (${nameKr || '한글명 없음'})`);
        } else {
          // 3단계: 종목 마스터에도 없는 경우 (fallback)
          console.log(`[US Stock Price API] ${symbol} - 종목 마스터에 없음, 티커 사용`);
        }
      } catch (masterError) {
        // 종목 마스터 조회 실패 시 무시하고 fallback 사용
        console.warn(`[US Stock Price API] 종목 마스터 조회 실패:`, masterError);
      }
    }

    console.log(`[US Stock Price API] ${symbol} (${exchange}) 시세 조회 시작`);

    const priceData = await getOverseasStockPrice(exchange, symbol);

    return NextResponse.json({
      symbol,
      name,
      nameKr,  // 한글명 추가 (종목 마스터에서 조회, 없으면 undefined)
      exchange,
      currentPrice: priceData.currentPrice,
      change: priceData.change,
      changePercent: priceData.changePercent,
      volume: priceData.volume,
      timestamp: priceData.timestamp,
    });
  } catch (error) {
    console.error(`[API /api/kis/overseas/stock/price] ${symbol} 에러:`, error);

    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';

    if (errorMessage.includes('API 키가 설정되지 않았습니다')) {
      return NextResponse.json(
        {
          error: 'API_KEY_NOT_CONFIGURED',
          message: errorMessage,
        },
        { status: 500 }
      );
    }

    if (errorMessage.includes('인증') || errorMessage.includes('토큰')) {
      return NextResponse.json(
        {
          error: 'AUTHENTICATION_ERROR',
          message: errorMessage,
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message: errorMessage,
      },
      { status: 500 }
    );
  }
}
