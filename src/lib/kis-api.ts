/**
 * 한국투자증권 Open API 유틸리티
 *
 * @see https://apiportal.koreainvestment.com - 한국투자증권 Open API 포털
 * @see https://github.com/koreainvestment/open-trading-api - 공식 GitHub 샘플코드
 *
 * 주요 기능:
 * 1. 접근토큰 발급 및 캐싱 (토큰은 24시간 유효)
 * 2. 공통 헤더 생성
 * 3. API 호출 유틸리티
 *
 * 환경변수 (.env.local):
 * - KIS_APP_KEY: 앱키 (Open API 포털에서 발급)
 * - KIS_APP_SECRET: 앱시크릿 (Open API 포털에서 발급)
 * - KIS_ACCOUNT_NO: 계좌번호 (8자리)
 * - KIS_PROD_CODE: 상품코드 (01: 주식, 02: 선물옵션 등)
 * - KIS_BASE_URL: API 기본 URL
 *     실전투자: https://openapi.koreainvestment.com:9443
 *     모의투자: https://openapivts.koreainvestment.com:29443
 *
 * Rate Limit 주의사항:
 * - 토큰 재발급: 1분당 1회 제한
 * - API 호출: 초당 20회 제한 (일반적인 조회 API)
 * - 주문 API: 초당 10회 제한
 */

import type {
  KISTokenResponse,
  CachedToken,
  KISStockPriceResponse,
  KISIndexPriceResponse,
  StockPriceData,
  IndexPriceData,
} from '@/types/kis';

// ==================== 환경변수 ====================

const KIS_APP_KEY = process.env.KIS_APP_KEY;
const KIS_APP_SECRET = process.env.KIS_APP_SECRET;
const KIS_ACCOUNT_NO = process.env.KIS_ACCOUNT_NO;
const KIS_PROD_CODE = process.env.KIS_PROD_CODE || '01';
const KIS_BASE_URL = process.env.KIS_BASE_URL || 'https://openapi.koreainvestment.com:9443';

// ==================== 토큰 캐싱 ====================

/**
 * 토큰 캐시 (서버 메모리에 저장)
 * - Next.js API Routes는 서버리스 환경에서 실행될 수 있으므로
 *   완벽한 캐싱이 보장되지 않음
 * - 프로덕션에서는 Redis 등 외부 캐시 사용 권장
 */
let tokenCache: CachedToken | null = null;

/**
 * 환경변수 검증
 * @throws 필수 환경변수가 없으면 에러
 */
function validateEnv(): void {
  if (!KIS_APP_KEY || !KIS_APP_SECRET) {
    throw new Error(
      '한국투자증권 API 키가 설정되지 않았습니다. ' +
        '.env.local 파일에 KIS_APP_KEY와 KIS_APP_SECRET을 설정해주세요. ' +
        '키는 https://apiportal.koreainvestment.com 에서 발급받을 수 있습니다.'
    );
  }
}

/**
 * 접근토큰 발급
 *
 * @description
 * POST /oauth2/tokenP 엔드포인트로 토큰 발급
 * - 토큰은 24시간(86400초) 유효
 * - 1분당 1회 발급 제한이 있으므로 캐싱 필수
 *
 * @see https://apiportal.koreainvestment.com/apiservice/oauth2#L_5c87ba63-740a-4166-93ac-803510f9571d
 *
 * @returns 접근토큰
 * @throws 토큰 발급 실패 시 에러
 */
export async function getAccessToken(): Promise<string> {
  validateEnv();

  // 캐시된 토큰이 유효한지 확인 (만료 10분 전까지 유효하다고 판단)
  if (tokenCache) {
    const now = new Date();
    const bufferTime = 10 * 60 * 1000; // 10분 버퍼
    if (tokenCache.expiresAt.getTime() - bufferTime > now.getTime()) {
      console.log('[KIS API] 캐시된 토큰 사용');
      return tokenCache.accessToken;
    }
    console.log('[KIS API] 토큰 만료 임박, 재발급 필요');
  }

  console.log('[KIS API] 새 토큰 발급 중...');

  const response = await fetch(`${KIS_BASE_URL}/oauth2/tokenP`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      appkey: KIS_APP_KEY,
      appsecret: KIS_APP_SECRET,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[KIS API] 토큰 발급 실패:', errorText);
    throw new Error(`토큰 발급 실패: ${response.status} ${errorText}`);
  }

  const data: KISTokenResponse = await response.json();

  // 토큰 캐싱
  // expires_in은 초 단위 (보통 86400 = 24시간)
  const expiresAt = new Date(Date.now() + data.expires_in * 1000);
  tokenCache = {
    accessToken: data.access_token,
    expiresAt,
  };

  console.log('[KIS API] 토큰 발급 완료, 만료:', expiresAt.toISOString());

  return data.access_token;
}

/**
 * 토큰 캐시 강제 초기화
 * (토큰이 유효하지 않을 때 사용)
 */
export function clearTokenCache(): void {
  tokenCache = null;
  console.log('[KIS API] 토큰 캐시 초기화됨');
}

// ==================== 공통 헤더 ====================

/**
 * API 호출에 필요한 공통 헤더 생성
 *
 * @param accessToken 접근토큰
 * @param trId 거래ID (API별로 다름)
 * @returns HTTP 헤더 객체
 *
 * @description
 * 한국투자증권 API는 다음 헤더가 필수:
 * - authorization: Bearer 토큰
 * - appkey: 앱키
 * - appsecret: 앱시크릿
 * - tr_id: 거래ID (API마다 고유한 값)
 *
 * 거래ID (tr_id) 참고:
 * - FHKST01010100: 주식현재가 시세
 * - FHPUP02100000: 업종(지수) 현재가
 * - FHKST01010300: 주식현재가 일자별
 * - FHKST01010400: 주식현재가 호가
 */
export function getCommonHeaders(accessToken: string, trId: string): HeadersInit {
  return {
    'Content-Type': 'application/json; charset=utf-8',
    authorization: `Bearer ${accessToken}`,
    appkey: KIS_APP_KEY!,
    appsecret: KIS_APP_SECRET!,
    tr_id: trId,
    // custtype: 'P', // P: 개인, B: 법인 (선택사항)
  };
}

// ==================== 주식 현재가 조회 ====================

/**
 * 주식 현재가 조회
 *
 * @param symbol 종목코드 (6자리, 예: 005930 삼성전자)
 * @returns 주식 현재가 정보
 *
 * @description
 * GET /uapi/domestic-stock/v1/quotations/inquire-price
 * tr_id: FHKST01010100
 *
 * Query Parameters:
 * - FID_COND_MRKT_DIV_CODE: J (주식/ETF/ETN)
 * - FID_INPUT_ISCD: 종목코드
 *
 * @see https://apiportal.koreainvestment.com/apiservice/apiservice-domestic-stock-quotations#L_07802512-4f49-4486-91b4-1050b6f5dc9d
 */
export async function getStockPrice(symbol: string): Promise<StockPriceData> {
  const accessToken = await getAccessToken();

  const url = new URL(`${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-price`);
  url.searchParams.append('FID_COND_MRKT_DIV_CODE', 'J'); // J: 주식, ETF, ETN
  url.searchParams.append('FID_INPUT_ISCD', symbol);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: getCommonHeaders(accessToken, 'FHKST01010100'),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[KIS API] 주식 현재가 조회 실패:', errorText);

    // 토큰 만료로 인한 실패일 수 있으므로 캐시 초기화 후 재시도
    if (response.status === 401) {
      clearTokenCache();
      throw new Error('인증 토큰이 만료되었습니다. 다시 시도해주세요.');
    }

    throw new Error(`주식 현재가 조회 실패: ${response.status}`);
  }

  const data: KISStockPriceResponse = await response.json();

  // API 응답 결과 확인
  if (data.rt_cd !== '0') {
    console.error('[KIS API] API 에러:', data.msg1);
    throw new Error(`API 에러: ${data.msg1} (${data.msg_cd})`);
  }

  // 데이터 정제 및 반환
  return transformStockPrice(symbol, data.output);
}

/**
 * 주식 현재가 데이터 변환
 * API 응답을 클라이언트용 형식으로 변환
 */
function transformStockPrice(
  symbol: string,
  raw: KISStockPriceResponse['output']
): StockPriceData {
  // 전일 대비 부호 변환
  // 1:상한, 2:상승, 3:보합, 4:하한, 5:하락
  const signMap: Record<string, string> = {
    '1': 'up',
    '2': 'up',
    '3': 'flat',
    '4': 'down',
    '5': 'down',
  };

  return {
    symbol,
    currentPrice: parseFloat(raw.stck_prpr) || 0,
    change: parseFloat(raw.prdy_vrss) || 0,
    changePercent: parseFloat(raw.prdy_ctrt) || 0,
    changeSign: signMap[raw.prdy_vrss_sign] || 'flat',
    volume: parseInt(raw.acml_vol) || 0,
    tradingValue: parseInt(raw.acml_tr_pbmn) || 0,
    open: parseFloat(raw.stck_oprc) || 0,
    high: parseFloat(raw.stck_hgpr) || 0,
    low: parseFloat(raw.stck_lwpr) || 0,
    high52w: parseFloat(raw.w52_hgpr) || 0,
    low52w: parseFloat(raw.w52_lwpr) || 0,
    per: parseFloat(raw.per) || 0,
    pbr: parseFloat(raw.pbr) || 0,
    eps: parseFloat(raw.eps) || 0,
    marketName: raw.rprs_mrkt_kor_name || '',
    timestamp: new Date().toISOString(),
  };
}

// ==================== 지수 현재가 조회 ====================

/**
 * 지수(업종) 현재가 조회
 *
 * @param indexCode 지수코드
 *   - 0001: 코스피
 *   - 1001: 코스닥
 *   - 2001: 코스피200
 *   - 3003: KRX300
 * @returns 지수 현재가 정보
 *
 * @description
 * GET /uapi/domestic-stock/v1/quotations/inquire-index-price
 * tr_id: FHPUP02100000
 *
 * Query Parameters:
 * - FID_COND_MRKT_DIV_CODE: U (업종)
 * - FID_INPUT_ISCD: 업종코드
 *
 * @see https://apiportal.koreainvestment.com/apiservice/apiservice-domestic-stock-quotations#L_2e6c2cb5-7aa5-42c8-bb2a-e36ab0e3db71
 */
export async function getIndexPrice(indexCode: string): Promise<IndexPriceData> {
  const accessToken = await getAccessToken();

  const url = new URL(`${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-index-price`);
  url.searchParams.append('FID_COND_MRKT_DIV_CODE', 'U'); // U: 업종
  url.searchParams.append('FID_INPUT_ISCD', indexCode);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: getCommonHeaders(accessToken, 'FHPUP02100000'),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[KIS API] 지수 현재가 조회 실패:', errorText);

    // 토큰 만료로 인한 실패일 수 있으므로 캐시 초기화 후 재시도
    if (response.status === 401) {
      clearTokenCache();
      throw new Error('인증 토큰이 만료되었습니다. 다시 시도해주세요.');
    }

    throw new Error(`지수 현재가 조회 실패: ${response.status}`);
  }

  const data: KISIndexPriceResponse = await response.json();

  // API 응답 결과 확인
  if (data.rt_cd !== '0') {
    console.error('[KIS API] API 에러:', data.msg1);
    throw new Error(`API 에러: ${data.msg1} (${data.msg_cd})`);
  }

  // 데이터 정제 및 반환
  return transformIndexPrice(indexCode, data.output);
}

/**
 * 지수 현재가 데이터 변환
 * API 응답을 클라이언트용 형식으로 변환
 */
function transformIndexPrice(
  indexCode: string,
  raw: KISIndexPriceResponse['output']
): IndexPriceData {
  // 지수코드별 이름 매핑
  const indexNameMap: Record<string, string> = {
    '0001': '코스피',
    '1001': '코스닥',
    '2001': '코스피200',
    '3003': 'KRX300',
  };

  // 전일 대비 부호 변환
  const signMap: Record<string, string> = {
    '1': 'up',
    '2': 'up',
    '3': 'flat',
    '4': 'down',
    '5': 'down',
  };

  return {
    indexCode,
    indexName: indexNameMap[indexCode] || `지수 ${indexCode}`,
    currentValue: parseFloat(raw.bstp_nmix_prpr) || 0,
    change: parseFloat(raw.bstp_nmix_prdy_vrss) || 0,
    changePercent: parseFloat(raw.bstp_nmix_prdy_ctrt) || 0,
    changeSign: signMap[raw.prdy_vrss_sign] || 'flat',
    volume: parseInt(raw.acml_vol) || 0,
    tradingValue: parseInt(raw.acml_tr_pbmn) || 0,
    open: parseFloat(raw.bstp_nmix_oprc) || 0,
    high: parseFloat(raw.bstp_nmix_hgpr) || 0,
    low: parseFloat(raw.bstp_nmix_lwpr) || 0,
    timestamp: new Date().toISOString(),
  };
}

// ==================== 계좌 정보 (참고용) ====================

/**
 * 계좌번호 반환 (CANO + ACNT_PRDT_CD 형식)
 * 일부 API에서 필요
 */
export function getAccountInfo(): { cano: string; acntPrdtCd: string } {
  return {
    cano: KIS_ACCOUNT_NO || '',      // 종합계좌번호 (8자리)
    acntPrdtCd: KIS_PROD_CODE || '', // 계좌상품코드 (2자리)
  };
}
