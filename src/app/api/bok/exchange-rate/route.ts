/**
 * 한국은행 ECOS API 환율 조회 라우트
 *
 * 한국은행 경제통계시스템(ECOS) OpenAPI를 통해 환율 데이터를 조회합니다.
 *
 * ============================================================
 * API 정보:
 * ============================================================
 * - 통계표코드: 731Y001 (주요국 통화의 대원화 환율)
 * - 주기: D (일간)
 * - 조회 항목:
 *   - 0000001: 원/미국달러 (매매기준율)
 *   - 0000002: 원/일본엔 (100엔)
 *   - 0000003: 원/유로
 *   - 0000012: 원/영국파운드
 *
 * ============================================================
 * API URL 형식:
 * ============================================================
 * https://ecos.bok.or.kr/api/StatisticSearch/{인증키}/json/kr/{시작}/{종료}/{통계표코드}/{주기}/{시작일}/{종료일}/{항목코드}
 *
 * ============================================================
 * 응답 데이터:
 * ============================================================
 * {
 *   usdkrw: { rate: 1434.50, change: 3.20, changePercent: 0.22 },
 *   jpykrw: { rate: 935.50, change: 2.10, changePercent: 0.22 },
 *   eurkrw: { rate: 1508.20, change: -3.50, changePercent: -0.23 },
 *   gbpkrw: { rate: 1818.30, change: 4.80, changePercent: 0.26 },
 * }
 */

import { NextResponse } from 'next/server';

// ==================== 타입 정의 ====================

/** 한국은행 API 응답 개별 항목 */
interface BOKDataItem {
  STAT_CODE: string;      // 통계표코드 (예: "731Y001")
  STAT_NAME: string;      // 통계명 (예: "주요국 통화의 대원화 환율")
  ITEM_CODE1: string;     // 통계항목코드1 (예: "0000001")
  ITEM_NAME1: string;     // 통계항목명1 (예: "원/미국달러(매매기준율)")
  ITEM_CODE2: string;     // 통계항목코드2
  ITEM_NAME2: string;     // 통계항목명2
  ITEM_CODE3: string;     // 통계항목코드3
  ITEM_NAME3: string;     // 통계항목명3
  UNIT_NAME: string;      // 단위 (예: "원")
  TIME: string;           // 시간 (예: "20250124")
  DATA_VALUE: string;     // 데이터값 (예: "1434.5")
}

/** 한국은행 API 응답 전체 구조 */
interface BOKResponse {
  StatisticSearch: {
    list_total_count: number;
    row: BOKDataItem[];
  };
}

/** 환율 데이터 응답 타입 */
interface ExchangeRateData {
  rate: number;           // 현재 환율
  change: number;         // 전일 대비 변동
  changePercent: number;  // 전일 대비 변동률 (%)
  date: string;           // 기준일 (YYYY-MM-DD)
}

/** API 응답 타입 */
interface ExchangeRateResponse {
  success: boolean;
  data: {
    usdkrw: ExchangeRateData;  // 원/달러
    jpykrw: ExchangeRateData;  // 원/100엔
    eurkrw: ExchangeRateData;  // 원/유로
    gbpkrw: ExchangeRateData;  // 원/파운드
  } | null;
  error?: string;
  timestamp: string;
}

// ==================== 상수 정의 ====================

/** 한국은행 API 기본 URL */
const BOK_API_BASE = 'https://ecos.bok.or.kr/api/StatisticSearch';

/** 통계표코드: 주요국 통화의 대원화 환율 */
const STAT_CODE = '731Y001';

/** 환율 항목 코드 매핑 */
const ITEM_CODES = {
  USD: '0000001',  // 원/미국달러 (매매기준율)
  JPY: '0000002',  // 원/일본엔 (100엔)
  EUR: '0000003',  // 원/유로
  GBP: '0000012',  // 원/영국파운드
} as const;

// ==================== 유틸리티 함수 ====================

/**
 * 날짜를 YYYYMMDD 형식으로 변환
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

/**
 * YYYYMMDD를 YYYY-MM-DD로 변환
 */
function formatDateDisplay(dateStr: string): string {
  return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
}

/**
 * 한국은행 API에서 특정 항목의 환율 데이터 조회
 *
 * @param apiKey - 인증키
 * @param itemCode - 통계항목코드 (예: "0000001")
 * @param startDate - 시작일 (YYYYMMDD)
 * @param endDate - 종료일 (YYYYMMDD)
 * @returns 환율 데이터 배열
 */
async function fetchBOKData(
  apiKey: string,
  itemCode: string,
  startDate: string,
  endDate: string
): Promise<BOKDataItem[]> {
  // API URL 구성
  // 형식: /StatisticSearch/{인증키}/json/kr/{시작건수}/{종료건수}/{통계표코드}/{주기}/{시작일}/{종료일}/{항목코드}
  const url = `${BOK_API_BASE}/${apiKey}/json/kr/1/10/${STAT_CODE}/D/${startDate}/${endDate}/${itemCode}`;

  console.log(`[BOK API] 요청: ${itemCode}`, { startDate, endDate });

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
    // 캐시 비활성화: 항상 최신 데이터를 가져오도록 설정
    // Next.js의 fetch 캐시가 오래된 데이터를 반환하는 문제 해결
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`한국은행 API 오류: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as BOKResponse;

  // API 응답 검증
  if (!data.StatisticSearch?.row) {
    console.warn(`[BOK API] 데이터 없음: ${itemCode}`, JSON.stringify(data));
    return [];
  }

  // 디버그: 실제 API 응답 데이터 출력
  console.log(`[BOK API] 응답 데이터 (${itemCode}):`,
    data.StatisticSearch.row.map(r => ({ date: r.TIME, value: r.DATA_VALUE }))
  );

  return data.StatisticSearch.row;
}

/**
 * 환율 데이터 파싱 및 변동률 계산
 *
 * @param dataList - 한국은행 API 응답 데이터 배열
 * @returns 파싱된 환율 데이터
 */
function parseExchangeRate(dataList: BOKDataItem[]): ExchangeRateData | null {
  if (dataList.length === 0) {
    return null;
  }

  // 시간순 정렬 후 최신 데이터 추출 (내림차순 - 가장 최근 날짜가 첫 번째)
  const sortedData = [...dataList].sort((a, b) => b.TIME.localeCompare(a.TIME));

  const latest = sortedData[0];
  const previous = sortedData[1];

  const rate = parseFloat(latest.DATA_VALUE);
  const prevRate = previous ? parseFloat(previous.DATA_VALUE) : rate;

  // 변동 계산
  const change = rate - prevRate;
  const changePercent = prevRate !== 0 ? (change / prevRate) * 100 : 0;

  // 디버그: 최신 데이터 확인
  console.log(`[BOK API] 파싱 결과: 최신=${latest.TIME}(${rate}), 전일=${previous?.TIME}(${prevRate})`);

  return {
    rate: Math.round(rate * 100) / 100,  // 소수점 2자리
    change: Math.round(change * 100) / 100,
    changePercent: Math.round(changePercent * 100) / 100,
    date: formatDateDisplay(latest.TIME),
  };
}

// ==================== API 핸들러 ====================

/**
 * GET /api/bok/exchange-rate
 *
 * 한국은행 ECOS API를 통해 환율 데이터 조회
 *
 * 응답 예시:
 * {
 *   "success": true,
 *   "data": {
 *     "usdkrw": { "rate": 1434.50, "change": 3.20, "changePercent": 0.22, "date": "2025-01-24" },
 *     "jpykrw": { "rate": 935.50, "change": 2.10, "changePercent": 0.22, "date": "2025-01-24" },
 *     "eurkrw": { "rate": 1508.20, "change": -3.50, "changePercent": -0.23, "date": "2025-01-24" },
 *     "gbpkrw": { "rate": 1818.30, "change": 4.80, "changePercent": 0.26, "date": "2025-01-24" }
 *   },
 *   "timestamp": "2025-01-24T10:30:00.000Z"
 * }
 */
export async function GET(): Promise<NextResponse<ExchangeRateResponse>> {
  try {
    // API 키 확인
    const apiKey = process.env.BOK_API_KEY;
    if (!apiKey) {
      console.error('[BOK API] API 키가 설정되지 않음');
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: 'API 키가 설정되지 않았습니다.',
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      );
    }

    // 날짜 범위 설정 (최근 7일 - 주말/공휴일 고려)
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 7);

    const startDateStr = formatDate(startDate);
    const endDateStr = formatDate(today);

    console.log('[BOK API] 환율 조회 시작', { startDateStr, endDateStr });

    // 병렬로 모든 환율 데이터 조회
    const [usdData, jpyData, eurData, gbpData] = await Promise.all([
      fetchBOKData(apiKey, ITEM_CODES.USD, startDateStr, endDateStr),
      fetchBOKData(apiKey, ITEM_CODES.JPY, startDateStr, endDateStr),
      fetchBOKData(apiKey, ITEM_CODES.EUR, startDateStr, endDateStr),
      fetchBOKData(apiKey, ITEM_CODES.GBP, startDateStr, endDateStr),
    ]);

    // 데이터 파싱
    const usdkrw = parseExchangeRate(usdData);
    const jpykrw = parseExchangeRate(jpyData);
    const eurkrw = parseExchangeRate(eurData);
    const gbpkrw = parseExchangeRate(gbpData);

    // 데이터 검증
    if (!usdkrw || !jpykrw || !eurkrw || !gbpkrw) {
      console.warn('[BOK API] 일부 환율 데이터 누락', {
        usdkrw: !!usdkrw,
        jpykrw: !!jpykrw,
        eurkrw: !!eurkrw,
        gbpkrw: !!gbpkrw,
      });
    }

    // 기본값 설정 (데이터 없을 경우)
    const defaultRate: ExchangeRateData = {
      rate: 0,
      change: 0,
      changePercent: 0,
      date: formatDateDisplay(endDateStr),
    };

    const responseData = {
      usdkrw: usdkrw || defaultRate,
      jpykrw: jpykrw || defaultRate,
      eurkrw: eurkrw || defaultRate,
      gbpkrw: gbpkrw || defaultRate,
    };

    console.log('[BOK API] 환율 조회 완료', responseData);

    return NextResponse.json({
      success: true,
      data: responseData,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[BOK API] 환율 조회 실패:', error);

    return NextResponse.json(
      {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : '환율 조회 중 오류가 발생했습니다.',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
