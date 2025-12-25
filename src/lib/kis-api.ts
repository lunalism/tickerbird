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
 *
 * @description
 * 한국투자증권 API는 토큰 발급에 1분당 1회 제한이 있으므로
 * 토큰을 캐싱하여 재사용해야 합니다.
 *
 * 캐싱 전략:
 * 1. 토큰은 24시간(86400초) 유효
 * 2. 만료 10분 전까지 캐시된 토큰 재사용
 * 3. 동시 요청 시 중복 발급 방지 (Promise 기반 락)
 * 4. Rate limit 에러(EGW00133) 발생 시 1분 대기 후 재시도
 *
 * 주의사항:
 * - Next.js API Routes는 서버리스 환경에서 실행될 수 있으므로
 *   인스턴스가 재시작되면 캐시가 초기화됨
 * - 프로덕션에서는 Redis 등 외부 캐시 사용 권장
 */
let tokenCache: CachedToken | null = null;

/**
 * 토큰 발급 진행 중인 Promise
 *
 * @description
 * 여러 API가 동시에 호출될 때 토큰 발급이 중복되지 않도록
 * 첫 번째 요청만 실제 발급을 수행하고, 나머지는 대기 후 결과를 공유합니다.
 *
 * 동작 방식:
 * 1. 첫 번째 요청: tokenPromise가 null → 토큰 발급 시작, Promise 저장
 * 2. 동시 요청: tokenPromise가 존재 → 기존 Promise 대기
 * 3. 발급 완료: Promise resolve, tokenPromise를 null로 초기화
 */
let tokenPromise: Promise<string> | null = null;

/**
 * Rate limit 에러 발생 시간
 *
 * @description
 * 토큰 발급 rate limit(1분당 1회)에 걸린 경우
 * 1분 동안 추가 발급 시도를 차단합니다.
 */
let rateLimitUntil: Date | null = null;

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
 * 캐시된 토큰이 유효한지 확인
 *
 * @description
 * 토큰 만료 10분 전까지는 유효하다고 판단합니다.
 * 이를 통해 만료 직전 API 호출 중 토큰이 만료되는 것을 방지합니다.
 *
 * @returns 유효한 토큰이 있으면 토큰 문자열, 없으면 null
 */
function getCachedTokenIfValid(): string | null {
  if (!tokenCache) return null;

  const now = new Date();
  const bufferTime = 10 * 60 * 1000; // 10분 버퍼 (만료 10분 전에 갱신)

  if (tokenCache.expiresAt.getTime() - bufferTime > now.getTime()) {
    return tokenCache.accessToken;
  }

  console.log('[KIS API] 토큰 만료 임박, 재발급 필요');
  return null;
}

/**
 * Rate limit 상태인지 확인
 *
 * @description
 * 토큰 발급 rate limit(1분당 1회)에 걸린 경우
 * 에러가 발생한 시점부터 1분 동안 true를 반환합니다.
 *
 * @returns rate limit 상태면 true
 */
function isRateLimited(): boolean {
  if (!rateLimitUntil) return false;

  const now = new Date();
  if (now < rateLimitUntil) {
    const remainingSeconds = Math.ceil((rateLimitUntil.getTime() - now.getTime()) / 1000);
    console.log(`[KIS API] Rate limit 상태, ${remainingSeconds}초 후 재시도 가능`);
    return true;
  }

  // Rate limit 해제
  rateLimitUntil = null;
  return false;
}

/**
 * 실제 토큰 발급 수행 (내부 함수)
 *
 * @description
 * 한국투자증권 OAuth2 토큰 발급 API를 호출합니다.
 * 이 함수는 직접 호출하지 않고 getAccessToken()을 통해 호출됩니다.
 *
 * @returns 접근토큰
 * @throws 토큰 발급 실패 시 에러
 */
async function fetchNewToken(): Promise<string> {
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

  // Rate limit 에러 처리 (EGW00133: 1분당 1회 제한)
  if (response.status === 403) {
    const errorText = await response.text();
    console.error('[KIS API] 토큰 발급 실패 (Rate Limit):', errorText);

    // Rate limit 에러 코드 확인
    if (errorText.includes('EGW00133')) {
      // 1분 동안 추가 발급 시도 차단
      rateLimitUntil = new Date(Date.now() + 60 * 1000);
      console.log('[KIS API] Rate limit 설정, 해제 시간:', rateLimitUntil.toISOString());
    }

    throw new Error(`토큰 발급 실패 (Rate Limit): ${response.status} ${errorText}`);
  }

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
 * 접근토큰 발급 (동시 요청 처리 포함)
 *
 * @description
 * POST /oauth2/tokenP 엔드포인트로 토큰 발급
 * - 토큰은 24시간(86400초) 유효
 * - 1분당 1회 발급 제한이 있으므로 캐싱 필수
 * - 동시 요청 시 중복 발급 방지 (Promise 기반 락)
 *
 * 동작 흐름:
 * 1. 캐시된 토큰이 유효하면 즉시 반환
 * 2. Rate limit 상태면 에러 throw
 * 3. 다른 요청이 토큰 발급 중이면 해당 Promise 대기
 * 4. 첫 번째 요청만 실제 토큰 발급 수행
 * 5. 발급 완료 후 모든 대기 중인 요청에 결과 전달
 *
 * @see https://apiportal.koreainvestment.com/apiservice/oauth2#L_5c87ba63-740a-4166-93ac-803510f9571d
 *
 * @returns 접근토큰
 * @throws 토큰 발급 실패 시 에러
 */
export async function getAccessToken(): Promise<string> {
  validateEnv();

  // 1단계: 캐시된 토큰이 유효하면 즉시 반환
  const cachedToken = getCachedTokenIfValid();
  if (cachedToken) {
    console.log('[KIS API] 캐시된 토큰 사용');
    return cachedToken;
  }

  // 2단계: Rate limit 상태 확인
  if (isRateLimited()) {
    // Rate limit 상태지만 캐시된 토큰이 있으면 사용 (만료 임박해도)
    if (tokenCache) {
      console.log('[KIS API] Rate limit 상태, 기존 토큰 사용 (만료 임박)');
      return tokenCache.accessToken;
    }
    throw new Error(
      '토큰 발급 rate limit 상태입니다. 1분 후 다시 시도해주세요. ' +
      '(EGW00133: 접근토큰 발급 1분당 1회 제한)'
    );
  }

  // 3단계: 다른 요청이 토큰 발급 중이면 대기
  if (tokenPromise) {
    console.log('[KIS API] 다른 요청이 토큰 발급 중, 대기...');
    try {
      return await tokenPromise;
    } catch {
      // 다른 요청이 실패해도 캐시된 토큰이 있으면 사용
      if (tokenCache) {
        console.log('[KIS API] 토큰 발급 실패, 기존 토큰 사용');
        return tokenCache.accessToken;
      }
      throw new Error('토큰 발급 대기 중 에러 발생');
    }
  }

  // 4단계: 토큰 발급 시작 (첫 번째 요청만)
  tokenPromise = fetchNewToken()
    .finally(() => {
      // 5단계: 발급 완료 후 Promise 초기화
      // 다음 만료 시점에 새로운 발급 요청을 받을 수 있도록
      tokenPromise = null;
    });

  return tokenPromise;
}

/**
 * 토큰 캐시 강제 초기화
 *
 * @description
 * 토큰이 유효하지 않을 때 (401 에러 등) 사용합니다.
 * 캐시된 토큰, 진행 중인 Promise, rate limit 상태를 모두 초기화합니다.
 *
 * 주의: rate limit도 초기화되므로 API 호출이 연속적으로 실패할 경우
 * rate limit 에러가 발생할 수 있습니다.
 */
export function clearTokenCache(): void {
  tokenCache = null;
  tokenPromise = null;
  rateLimitUntil = null;
  console.log('[KIS API] 토큰 캐시 초기화됨 (캐시, Promise, rate limit 모두 초기화)');
}

/**
 * 토큰 캐시 상태 확인 (디버깅용)
 *
 * @returns 토큰 캐시 상태 정보
 */
export function getTokenCacheStatus(): {
  hasToken: boolean;
  expiresAt: Date | null;
  isRateLimited: boolean;
  rateLimitUntil: Date | null;
  isPending: boolean;
} {
  return {
    hasToken: !!tokenCache,
    expiresAt: tokenCache?.expiresAt || null,
    isRateLimited: isRateLimited(),
    rateLimitUntil: rateLimitUntil,
    isPending: !!tokenPromise,
  };
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
 * 종목명 조회 (주식기본조회 API)
 *
 * @param symbol 종목코드 (6자리 숫자)
 * @returns 종목명
 *
 * @description
 * GET /uapi/domestic-stock/v1/quotations/search-stock-info
 * tr_id: CTPF1002R
 */
async function getStockName(symbol: string, accessToken: string): Promise<string> {
  try {
    const url = new URL(`${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/search-stock-info`);
    url.searchParams.append('PDNO', symbol);
    url.searchParams.append('PRDT_TYPE_CD', '300'); // 300: 주식

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: getCommonHeaders(accessToken, 'CTPF1002R'),
    });

    if (!response.ok) {
      console.error('[KIS API] 종목명 조회 실패:', response.status);
      return '';
    }

    const data = await response.json();
    if (data.rt_cd === '0' && data.output) {
      return data.output.prdt_abrv_name || data.output.prdt_name || '';
    }
    return '';
  } catch (error) {
    console.error('[KIS API] 종목명 조회 에러:', error);
    return '';
  }
}

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

  // 시세 조회와 종목명 조회를 병렬로 실행
  const [priceResponse, stockName] = await Promise.all([
    fetch(
      (() => {
        const url = new URL(`${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-price`);
        url.searchParams.append('FID_COND_MRKT_DIV_CODE', 'J');
        url.searchParams.append('FID_INPUT_ISCD', symbol);
        return url.toString();
      })(),
      {
        method: 'GET',
        headers: getCommonHeaders(accessToken, 'FHKST01010100'),
      }
    ),
    getStockName(symbol, accessToken),
  ]);

  if (!priceResponse.ok) {
    const errorText = await priceResponse.text();
    console.error('[KIS API] 주식 현재가 조회 실패:', errorText);

    if (priceResponse.status === 401) {
      clearTokenCache();
      throw new Error('인증 토큰이 만료되었습니다. 다시 시도해주세요.');
    }

    throw new Error(`주식 현재가 조회 실패: ${priceResponse.status}`);
  }

  const data: KISStockPriceResponse = await priceResponse.json();

  if (data.rt_cd !== '0') {
    console.error('[KIS API] API 에러:', data.msg1);
    throw new Error(`API 에러: ${data.msg1} (${data.msg_cd})`);
  }

  // 데이터 정제 및 반환 (종목명 포함)
  return transformStockPrice(symbol, data.output, stockName);
}

/**
 * 주식 현재가 데이터 변환
 * API 응답을 클라이언트용 형식으로 변환
 */
function transformStockPrice(
  symbol: string,
  raw: KISStockPriceResponse['output'],
  stockName: string = ''
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
    stockName,  // 주식기본조회 API에서 가져온 종목명
    currentPrice: parseFloat(raw.stck_prpr) || 0,
    change: parseFloat(raw.prdy_vrss) || 0,
    changePercent: parseFloat(raw.prdy_ctrt) || 0,
    changeSign: signMap[raw.prdy_vrss_sign] || 'flat',
    volume: parseInt(raw.acml_vol) || 0,
    tradingValue: parseInt(raw.acml_tr_pbmn) || 0,
    openPrice: parseFloat(raw.stck_oprc) || 0,
    highPrice: parseFloat(raw.stck_hgpr) || 0,
    lowPrice: parseFloat(raw.stck_lwpr) || 0,
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

// ==================== 순위 조회 API ====================

import type {
  KISVolumeRankingResponse,
  KISVolumeRankingItem,
  VolumeRankingData,
  KISFluctuationRankingResponse,
  KISFluctuationRankingItem,
  FluctuationRankingData,
  KISMarketCapRankingResponse,
  KISMarketCapRankingItem,
  MarketCapRankingData,
} from '@/types/kis';

/**
 * 전일 대비 부호 변환 함수
 * 1:상한, 2:상승, 3:보합, 4:하한, 5:하락
 */
function getChangeSign(sign: string): string {
  const signMap: Record<string, string> = {
    '1': 'up',
    '2': 'up',
    '3': 'flat',
    '4': 'down',
    '5': 'down',
  };
  return signMap[sign] || 'flat';
}

/**
 * 거래량순위 조회
 *
 * @param market 시장구분 ('all' | 'kospi' | 'kosdaq')
 * @returns 거래량순위 데이터 (최대 30건)
 *
 * @description
 * GET /uapi/domestic-stock/v1/quotations/volume-rank
 * tr_id: FHPST01710000
 *
 * 한국투자 HTS(eFriend Plus) > [0171] 거래량 순위 화면의 기능을 API로 개발
 * 최대 30건 확인 가능, 다음 조회 불가
 *
 * @see https://apiportal.koreainvestment.com/apiservice/apiservice-domestic-stock-ranking
 */
export async function getVolumeRanking(
  market: 'all' | 'kospi' | 'kosdaq' = 'all'
): Promise<VolumeRankingData[]> {
  const accessToken = await getAccessToken();

  // 시장코드 변환 (0000: 전체, 0001: 코스피, 1001: 코스닥)
  const marketCodeMap: Record<string, string> = {
    all: '0000',
    kospi: '0001',
    kosdaq: '1001',
  };

  const url = new URL(`${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/volume-rank`);
  // 필수 파라미터 설정
  url.searchParams.append('FID_COND_MRKT_DIV_CODE', 'J');       // J: 주식/ETF/ETN
  url.searchParams.append('FID_COND_SCR_DIV_CODE', '20171');    // 거래량순위 화면코드
  url.searchParams.append('FID_INPUT_ISCD', marketCodeMap[market]); // 시장구분
  url.searchParams.append('FID_DIV_CLS_CODE', '0');             // 0: 전체
  url.searchParams.append('FID_BLNG_CLS_CODE', '0');            // 0: 평균거래량
  url.searchParams.append('FID_TRGT_CLS_CODE', '111111111');    // 전체 대상
  url.searchParams.append('FID_TRGT_EXLS_CLS_CODE', '000000');  // 제외 없음
  url.searchParams.append('FID_INPUT_PRICE_1', '0');            // 최저가격: 전체
  url.searchParams.append('FID_INPUT_PRICE_2', '0');            // 최고가격: 전체
  url.searchParams.append('FID_VOL_CNT', '0');                  // 거래량: 전체
  url.searchParams.append('FID_INPUT_DATE_1', '0');             // 기간: 전체

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: getCommonHeaders(accessToken, 'FHPST01710000'),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[KIS API] 거래량순위 조회 실패:', errorText);

    if (response.status === 401) {
      clearTokenCache();
      throw new Error('인증 토큰이 만료되었습니다. 다시 시도해주세요.');
    }

    throw new Error(`거래량순위 조회 실패: ${response.status}`);
  }

  const data: KISVolumeRankingResponse = await response.json();

  if (data.rt_cd !== '0') {
    console.error('[KIS API] API 에러:', data.msg1);
    throw new Error(`API 에러: ${data.msg1} (${data.msg_cd})`);
  }

  // output이 없거나 빈 배열인 경우 빈 배열 반환
  if (!data.output || !Array.isArray(data.output)) {
    console.warn('[KIS API] 거래량순위 데이터가 없습니다.');
    return [];
  }

  // 데이터 변환 및 반환
  return data.output.map((item, index) => transformVolumeRanking(item, index + 1));
}

/**
 * 거래량순위 데이터 변환
 */
function transformVolumeRanking(raw: KISVolumeRankingItem, defaultRank: number): VolumeRankingData {
  return {
    rank: parseInt(raw.data_rank) || defaultRank,
    symbol: raw.mksc_shrn_iscd,
    name: raw.hts_kor_isnm,
    currentPrice: parseFloat(raw.stck_prpr) || 0,
    change: parseFloat(raw.prdy_vrss) || 0,
    changePercent: parseFloat(raw.prdy_ctrt) || 0,
    changeSign: getChangeSign(raw.prdy_vrss_sign),
    volume: parseInt(raw.acml_vol) || 0,
    tradingValue: parseInt(raw.acml_tr_pbmn) || 0,
    volumeIncreaseRate: parseFloat(raw.vol_inrt) || 0,
  };
}

/**
 * 등락률순위 조회
 *
 * @param market 시장구분 ('all' | 'kospi' | 'kosdaq')
 * @param sortOrder 정렬순서 ('asc': 상승률순, 'desc': 하락률순)
 * @returns 등락률순위 데이터 (최대 30건)
 *
 * @description
 * GET /uapi/domestic-stock/v1/ranking/fluctuation
 * tr_id: FHPST01700000
 *
 * 한국투자 HTS(eFriend Plus) > [0170] 등락률 순위 화면의 기능을 API로 개발
 * 최대 30건 확인 가능, 다음 조회 불가
 *
 * @see https://apiportal.koreainvestment.com/apiservice/apiservice-domestic-stock-ranking
 */
export async function getFluctuationRanking(
  market: 'all' | 'kospi' | 'kosdaq' = 'all',
  sortOrder: 'asc' | 'desc' = 'asc'
): Promise<FluctuationRankingData[]> {
  const accessToken = await getAccessToken();

  // 시장코드 변환
  const marketCodeMap: Record<string, string> = {
    all: '0000',
    kospi: '0001',
    kosdaq: '1001',
  };

  // 정렬코드 변환 (0: 상승률순, 1: 하락률순)
  const sortCodeMap: Record<string, string> = {
    asc: '0',   // 상승률 높은 순
    desc: '1',  // 하락률 높은 순
  };

  // 등락률순위 API 엔드포인트: /uapi/domestic-stock/v1/ranking/fluctuation
  // 한국투자 HTS [0170] 등락률 순위 화면 API
  // 참고: 공식 GitHub 문서 (examples_llm/domestic_stock/fluctuation) 참조
  const url = new URL(`${KIS_BASE_URL}/uapi/domestic-stock/v1/ranking/fluctuation`);
  url.searchParams.append('fid_cond_mrkt_div_code', 'J');       // J: 주식/ETF/ETN (KRX만 허용)
  url.searchParams.append('fid_cond_scr_div_code', '20170');    // 등락률순위 화면코드 (고정값)
  url.searchParams.append('fid_input_iscd', marketCodeMap[market]); // 시장구분
  url.searchParams.append('fid_rank_sort_cls_code', sortCodeMap[sortOrder]); // 0:상승률, 1:하락률
  url.searchParams.append('fid_input_cnt_1', '0');              // 조회 종목 수 (0: 전체)
  url.searchParams.append('fid_prc_cls_code', '0');             // 0: 저가대비
  url.searchParams.append('fid_input_price_1', '');             // 가격 하한선 (빈값: 전체)
  url.searchParams.append('fid_input_price_2', '');             // 가격 상한선 (빈값: 전체)
  url.searchParams.append('fid_vol_cnt', '');                   // 최소 거래량 (빈값: 전체)
  url.searchParams.append('fid_trgt_cls_code', '0');            // 대상 구분 (0: 전체)
  url.searchParams.append('fid_trgt_exls_cls_code', '0');       // 대상 제외 구분 (0: 전체)
  url.searchParams.append('fid_div_cls_code', '0');             // 주식 종류 (0: 전체)
  url.searchParams.append('fid_rsfl_rate1', '');                // 등락률 하한 (빈값: 전체)
  url.searchParams.append('fid_rsfl_rate2', '');                // 등락률 상한 (빈값: 전체)

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: getCommonHeaders(accessToken, 'FHPST01700000'),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[KIS API] 등락률순위 조회 실패:', errorText);

    if (response.status === 401) {
      clearTokenCache();
      throw new Error('인증 토큰이 만료되었습니다. 다시 시도해주세요.');
    }

    throw new Error(`등락률순위 조회 실패: ${response.status}`);
  }

  const data: KISFluctuationRankingResponse = await response.json();

  if (data.rt_cd !== '0') {
    console.error('[KIS API] API 에러:', data.msg1);
    throw new Error(`API 에러: ${data.msg1} (${data.msg_cd})`);
  }

  // output이 없거나 빈 배열인 경우 빈 배열 반환
  if (!data.output || !Array.isArray(data.output)) {
    console.warn('[KIS API] 등락률순위 데이터가 없습니다.');
    return [];
  }

  return data.output.map((item, index) => transformFluctuationRanking(item, index + 1));
}

/**
 * 등락률순위 데이터 변환
 */
function transformFluctuationRanking(raw: KISFluctuationRankingItem, defaultRank: number): FluctuationRankingData {
  return {
    rank: parseInt(raw.data_rank) || defaultRank,
    symbol: raw.mksc_shrn_iscd,
    name: raw.hts_kor_isnm,
    currentPrice: parseFloat(raw.stck_prpr) || 0,
    change: parseFloat(raw.prdy_vrss) || 0,
    changePercent: parseFloat(raw.prdy_ctrt) || 0,
    changeSign: getChangeSign(raw.prdy_vrss_sign),
    volume: parseInt(raw.acml_vol) || 0,
    highPrice: parseFloat(raw.stck_hgpr) || 0,
    lowPrice: parseFloat(raw.stck_lwpr) || 0,
    openPrice: parseFloat(raw.stck_oprc) || 0,
  };
}

/**
 * 시가총액순위 조회
 *
 * @param market 시장구분 ('all' | 'kospi' | 'kosdaq')
 * @returns 시가총액순위 데이터 (최대 30건)
 *
 * @description
 * GET /uapi/domestic-stock/v1/quotations/market-cap
 * tr_id: FHPST01740000
 *
 * 한국투자 HTS(eFriend Plus) > [0174] 시가총액 상위 화면의 기능을 API로 개발
 * 최대 30건 확인 가능, 다음 조회 불가
 *
 * @see https://apiportal.koreainvestment.com/apiservice/apiservice-domestic-stock-ranking
 */
export async function getMarketCapRanking(
  market: 'all' | 'kospi' | 'kosdaq' = 'all'
): Promise<MarketCapRankingData[]> {
  const accessToken = await getAccessToken();

  // 시장코드 변환
  const marketCodeMap: Record<string, string> = {
    all: '0000',
    kospi: '0001',
    kosdaq: '1001',
  };

  // 시가총액순위 API 엔드포인트: /uapi/domestic-stock/v1/ranking/market-cap
  // 참고: /quotations/market-cap은 404 에러, /ranking/market-cap이 올바른 경로
  // 공식 GitHub 문서 (examples_llm/domestic_stock/market_cap) 참조
  const url = new URL(`${KIS_BASE_URL}/uapi/domestic-stock/v1/ranking/market-cap`);
  url.searchParams.append('fid_cond_mrkt_div_code', 'J');       // J: 주식 (KRX만 허용)
  url.searchParams.append('fid_cond_scr_div_code', '20174');    // 시가총액상위 화면코드 (고정값)
  url.searchParams.append('fid_input_iscd', marketCodeMap[market]); // 시장구분
  url.searchParams.append('fid_div_cls_code', '0');             // 주식 종류 (0:전체, 1:보통주, 2:우선주)
  url.searchParams.append('fid_trgt_cls_code', '0');            // 대상 구분 (0: 전체만 허용)
  url.searchParams.append('fid_trgt_exls_cls_code', '0');       // 대상 제외 구분 (0: 전체만 허용)
  url.searchParams.append('fid_input_price_1', '');             // 가격 하한선 (빈값: 전체)
  url.searchParams.append('fid_input_price_2', '');             // 가격 상한선 (빈값: 전체)
  url.searchParams.append('fid_vol_cnt', '');                   // 최소 거래량 (빈값: 전체)

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: getCommonHeaders(accessToken, 'FHPST01740000'),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[KIS API] 시가총액순위 조회 실패:', errorText);

    if (response.status === 401) {
      clearTokenCache();
      throw new Error('인증 토큰이 만료되었습니다. 다시 시도해주세요.');
    }

    throw new Error(`시가총액순위 조회 실패: ${response.status}`);
  }

  const data: KISMarketCapRankingResponse = await response.json();

  if (data.rt_cd !== '0') {
    console.error('[KIS API] API 에러:', data.msg1);
    throw new Error(`API 에러: ${data.msg1} (${data.msg_cd})`);
  }

  // output이 없거나 빈 배열인 경우 빈 배열 반환
  if (!data.output || !Array.isArray(data.output)) {
    console.warn('[KIS API] 시가총액순위 데이터가 없습니다.');
    return [];
  }

  return data.output.map((item, index) => transformMarketCapRanking(item, index + 1));
}

/**
 * 시가총액순위 데이터 변환
 */
function transformMarketCapRanking(raw: KISMarketCapRankingItem, defaultRank: number): MarketCapRankingData {
  return {
    rank: parseInt(raw.data_rank) || defaultRank,
    symbol: raw.mksc_shrn_iscd,
    name: raw.hts_kor_isnm,
    currentPrice: parseFloat(raw.stck_prpr) || 0,
    change: parseFloat(raw.prdy_vrss) || 0,
    changePercent: parseFloat(raw.prdy_ctrt) || 0,
    changeSign: getChangeSign(raw.prdy_vrss_sign),
    volume: parseInt(raw.acml_vol) || 0,
    marketCap: parseFloat(raw.stck_avls) || 0,
    marketCapRatio: parseFloat(raw.mrkt_whol_avls_rlim) || 0,
  };
}

// ==================== 해외주식 API ====================
// @see https://apiportal.koreainvestment.com/apiservice/apiservice-overseas-stock
// @see https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/overseas_stock

import type {
  OverseasExchangeCode,
  OverseasIndexCode,
  KISOverseasIndexChartResponse,
  OverseasIndexData,
  KISOverseasStockPriceResponse,
  OverseasStockPriceData,
  KISOverseasVolumeRankingResponse,
  KISOverseasVolumeRankingItem,
  OverseasVolumeRankingData,
  KISOverseasMarketCapRankingResponse,
  KISOverseasMarketCapRankingItem,
  OverseasMarketCapRankingData,
  KISOverseasFluctuationRankingResponse,
  KISOverseasFluctuationRankingItem,
  OverseasFluctuationRankingData,
} from '@/types/kis';

/**
 * 해외 대비 부호 변환 함수
 * 해외주식 API의 sign 필드는 국내와 다른 값 체계 사용
 * 1:상승, 2:보합, 3:하락, 4:상한, 5:하한
 */
function getOverseasChangeSign(sign: string): string {
  const signMap: Record<string, string> = {
    '1': 'up',
    '2': 'flat',
    '3': 'down',
    '4': 'up',    // 상한 = 상승
    '5': 'down',  // 하한 = 하락
  };
  return signMap[sign] || 'flat';
}

/**
 * 미국 지수명 매핑
 */
const US_INDEX_NAME_MAP: Record<OverseasIndexCode, string> = {
  'SPX': 'S&P 500',
  'CCMP': 'NASDAQ',
  'INDU': 'DOW JONES',
  'RUT': 'Russell 2000',
};

/**
 * 해외지수 시세 조회
 *
 * @param indexCode 지수코드 (SPX: S&P500, CCMP: NASDAQ, INDU: DOW)
 * @returns 해외지수 현재가 정보
 *
 * @description
 * GET /uapi/overseas-price/v1/quotations/inquire-time-indexchartprice
 * tr_id: FHKST03030200
 *
 * @see https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/overseas_stock/inquire_time_indexchartprice
 */
export async function getOverseasIndexPrice(indexCode: OverseasIndexCode): Promise<OverseasIndexData> {
  const accessToken = await getAccessToken();

  const url = new URL(`${KIS_BASE_URL}/uapi/overseas-price/v1/quotations/inquire-time-indexchartprice`);
  url.searchParams.append('FID_COND_MRKT_DIV_CODE', 'N');  // N: 해외지수
  url.searchParams.append('FID_INPUT_ISCD', indexCode);
  url.searchParams.append('FID_HOUR_CLS_CODE', '0');       // 0: 정규장
  url.searchParams.append('FID_PW_DATA_INCU_YN', 'Y');     // 과거 데이터 포함

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: getCommonHeaders(accessToken, 'FHKST03030200'),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[KIS API] 해외지수 조회 실패:', errorText);

    if (response.status === 401) {
      clearTokenCache();
      throw new Error('인증 토큰이 만료되었습니다. 다시 시도해주세요.');
    }

    throw new Error(`해외지수 조회 실패: ${response.status}`);
  }

  const data: KISOverseasIndexChartResponse = await response.json();

  // 디버그: 실제 API 응답 로깅
  console.log(`[KIS API] 해외지수 ${indexCode} 응답:`, JSON.stringify({
    rt_cd: data.rt_cd,
    msg1: data.msg1,
    output1: data.output1 ? {
      ovrs_nmix_prpr: data.output1.ovrs_nmix_prpr,
      ovrs_nmix_prdy_vrss: data.output1.ovrs_nmix_prdy_vrss,
    } : 'no output1',
  }));

  if (data.rt_cd !== '0') {
    console.error('[KIS API] API 에러:', data.msg1);
    throw new Error(`API 에러: ${data.msg1} (${data.msg_cd})`);
  }

  // 데이터 정제 및 반환
  const info = data.output1;
  const latestChart = data.output2?.[0];

  return {
    indexCode,
    indexName: US_INDEX_NAME_MAP[indexCode] || indexCode,
    currentValue: parseFloat(info.ovrs_nmix_prpr) || 0,
    change: parseFloat(info.ovrs_nmix_prdy_vrss) || 0,
    changePercent: parseFloat(info.prdy_ctrt) || 0,
    changeSign: getOverseasChangeSign(info.prdy_vrss_sign),
    openValue: latestChart ? parseFloat(latestChart.ovrs_nmix_oprc) || undefined : undefined,
    highValue: latestChart ? parseFloat(latestChart.ovrs_nmix_hgpr) || undefined : undefined,
    lowValue: latestChart ? parseFloat(latestChart.ovrs_nmix_lwpr) || undefined : undefined,
    volume: latestChart ? parseInt(latestChart.acml_vol) || undefined : undefined,
    timestamp: new Date().toISOString(),
  };
}

/**
 * 해외주식 현재가 조회
 *
 * @param exchange 거래소코드 (NAS: 나스닥, NYS: 뉴욕, AMS: 아멕스)
 * @param symbol 종목코드 (예: AAPL, TSLA, MSFT)
 * @returns 해외주식 현재가 정보
 *
 * @description
 * GET /uapi/overseas-price/v1/quotations/price
 * tr_id: HHDFS00000300
 *
 * @see https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/overseas_stock/price
 */
export async function getOverseasStockPrice(
  exchange: OverseasExchangeCode,
  symbol: string
): Promise<OverseasStockPriceData> {
  const accessToken = await getAccessToken();

  const url = new URL(`${KIS_BASE_URL}/uapi/overseas-price/v1/quotations/price`);
  url.searchParams.append('AUTH', '');
  url.searchParams.append('EXCD', exchange);
  url.searchParams.append('SYMB', symbol);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: getCommonHeaders(accessToken, 'HHDFS00000300'),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[KIS API] 해외주식 현재가 조회 실패:', errorText);

    if (response.status === 401) {
      clearTokenCache();
      throw new Error('인증 토큰이 만료되었습니다. 다시 시도해주세요.');
    }

    throw new Error(`해외주식 현재가 조회 실패: ${response.status}`);
  }

  const data: KISOverseasStockPriceResponse = await response.json();

  // 디버그: 실제 API 응답 로깅
  console.log(`[KIS API] 해외주식 ${exchange}:${symbol} 응답:`, JSON.stringify({
    rt_cd: data.rt_cd,
    msg1: data.msg1,
    output_keys: data.output ? Object.keys(data.output) : 'no output',
    last: data.output?.last,
    base: data.output?.base,
  }));

  if (data.rt_cd !== '0') {
    console.error('[KIS API] API 에러:', data.msg1);
    throw new Error(`API 에러: ${data.msg1} (${data.msg_cd})`);
  }

  const output = data.output;

  // NYS 거래소에서 빈 데이터가 반환되면 AMS(NYSE ARCA)로 재시도
  // 많은 ETF가 NYSE ARCA에 상장되어 있어 AMS 코드가 필요할 수 있음
  if (exchange === 'NYS' && (!output.last || output.last === '')) {
    console.log(`[KIS API] ${symbol}: NYS 빈 응답, AMS로 재시도...`);
    try {
      return await getOverseasStockPrice('AMS' as OverseasExchangeCode, symbol);
    } catch (retryError) {
      console.log(`[KIS API] ${symbol}: AMS도 실패, 원본 응답 사용`);
    }
  }

  return {
    symbol,
    exchange,
    currentPrice: parseFloat(output.last) || 0,
    change: parseFloat(output.diff) || 0,
    changePercent: parseFloat(output.rate) || 0,
    changeSign: getOverseasChangeSign(output.sign),
    volume: parseInt(output.tvol) || 0,
    tradingValue: parseFloat(output.tamt) || 0,
    previousClose: parseFloat(output.base) || 0,
    previousVolume: parseInt(output.pvol) || 0,
    timestamp: new Date().toISOString(),
  };
}

/**
 * 해외주식 거래량순위 조회
 *
 * @param exchange 거래소코드 (NAS: 나스닥, NYS: 뉴욕, AMS: 아멕스)
 * @returns 거래량순위 데이터 (페이지네이션 지원)
 *
 * @description
 * GET /uapi/overseas-stock/v1/ranking/trade-vol
 * tr_id: HHDFS76310010
 *
 * @see https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/overseas_stock/trade_vol
 */
export async function getOverseasVolumeRanking(
  exchange: OverseasExchangeCode = 'NAS'
): Promise<OverseasVolumeRankingData[]> {
  const accessToken = await getAccessToken();

  const url = new URL(`${KIS_BASE_URL}/uapi/overseas-stock/v1/ranking/trade-vol`);
  url.searchParams.append('EXCD', exchange);
  url.searchParams.append('NDAY', '0');      // 0: 당일
  url.searchParams.append('VOL_RANG', '0');  // 0: 전체
  url.searchParams.append('AUTH', '');
  url.searchParams.append('KEYB', '');

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: getCommonHeaders(accessToken, 'HHDFS76310010'),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[KIS API] 해외주식 거래량순위 조회 실패:', errorText);

    if (response.status === 401) {
      clearTokenCache();
      throw new Error('인증 토큰이 만료되었습니다. 다시 시도해주세요.');
    }

    throw new Error(`해외주식 거래량순위 조회 실패: ${response.status}`);
  }

  const data: KISOverseasVolumeRankingResponse = await response.json();

  if (data.rt_cd !== '0') {
    console.error('[KIS API] API 에러:', data.msg1);
    throw new Error(`API 에러: ${data.msg1} (${data.msg_cd})`);
  }

  // output이 없거나 빈 배열인 경우 빈 배열 반환
  if (!data.output || !Array.isArray(data.output)) {
    console.warn('[KIS API] 해외주식 거래량순위 데이터가 없습니다.');
    return [];
  }

  return data.output.map((item, index) => transformOverseasVolumeRanking(item, index + 1, exchange));
}

/**
 * 해외주식 거래량순위 데이터 변환
 */
function transformOverseasVolumeRanking(
  raw: KISOverseasVolumeRankingItem,
  rank: number,
  exchange: OverseasExchangeCode
): OverseasVolumeRankingData {
  return {
    rank,
    symbol: raw.symb,
    name: raw.name,
    exchange,
    currentPrice: parseFloat(raw.last) || 0,
    change: parseFloat(raw.diff) || 0,
    changePercent: parseFloat(raw.rate) || 0,
    changeSign: getOverseasChangeSign(raw.sign),
    volume: parseInt(raw.tvol) || 0,
    tradingValue: parseFloat(raw.tamt) || 0,
    previousVolume: parseInt(raw.avol) || 0,
    volumeChangeRate: parseFloat(raw.prat) || 0,
  };
}

/**
 * 해외주식 시가총액순위 조회
 *
 * @param exchange 거래소코드 (NAS: 나스닥, NYS: 뉴욕)
 * @returns 시가총액순위 데이터
 *
 * @description
 * GET /uapi/overseas-stock/v1/ranking/market-cap
 * tr_id: HHDFS76350100
 *
 * @see https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/overseas_stock/market_cap
 */
export async function getOverseasMarketCapRanking(
  exchange: OverseasExchangeCode = 'NAS'
): Promise<OverseasMarketCapRankingData[]> {
  const accessToken = await getAccessToken();

  const url = new URL(`${KIS_BASE_URL}/uapi/overseas-stock/v1/ranking/market-cap`);
  url.searchParams.append('EXCD', exchange);
  url.searchParams.append('VOL_RANG', '0');  // 0: 전체
  url.searchParams.append('AUTH', '');
  url.searchParams.append('KEYB', '');

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: getCommonHeaders(accessToken, 'HHDFS76350100'),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[KIS API] 해외주식 시가총액순위 조회 실패:', errorText);

    if (response.status === 401) {
      clearTokenCache();
      throw new Error('인증 토큰이 만료되었습니다. 다시 시도해주세요.');
    }

    throw new Error(`해외주식 시가총액순위 조회 실패: ${response.status}`);
  }

  const data: KISOverseasMarketCapRankingResponse = await response.json();

  if (data.rt_cd !== '0') {
    console.error('[KIS API] API 에러:', data.msg1);
    throw new Error(`API 에러: ${data.msg1} (${data.msg_cd})`);
  }

  // output이 없거나 빈 배열인 경우 빈 배열 반환
  if (!data.output || !Array.isArray(data.output)) {
    console.warn('[KIS API] 해외주식 시가총액순위 데이터가 없습니다.');
    return [];
  }

  return data.output.map((item, index) => transformOverseasMarketCapRanking(item, index + 1, exchange));
}

/**
 * 해외주식 시가총액순위 데이터 변환
 */
function transformOverseasMarketCapRanking(
  raw: KISOverseasMarketCapRankingItem,
  rank: number,
  exchange: OverseasExchangeCode
): OverseasMarketCapRankingData {
  return {
    rank,
    symbol: raw.symb,
    name: raw.name,
    exchange,
    currentPrice: parseFloat(raw.last) || 0,
    change: parseFloat(raw.diff) || 0,
    changePercent: parseFloat(raw.rate) || 0,
    changeSign: getOverseasChangeSign(raw.sign),
    volume: parseInt(raw.tvol) || 0,
    marketCap: parseFloat(raw.mcap) || 0,
  };
}

/**
 * 해외주식 등락률순위 조회
 *
 * @param exchange 거래소코드 (NAS: 나스닥, NYS: 뉴욕)
 * @param sortOrder 정렬순서 ('asc': 상승률순, 'desc': 하락률순)
 * @returns 등락률순위 데이터
 *
 * @description
 * GET /uapi/overseas-stock/v1/ranking/updown-rate
 * tr_id: HHDFS76290000
 *
 * @see https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/overseas_stock/updown_rate
 */
export async function getOverseasFluctuationRanking(
  exchange: OverseasExchangeCode = 'NAS',
  sortOrder: 'asc' | 'desc' = 'asc'
): Promise<OverseasFluctuationRankingData[]> {
  const accessToken = await getAccessToken();

  // 정렬코드: 0: 하락률순, 1: 상승률순
  const sortCode = sortOrder === 'asc' ? '1' : '0';

  const url = new URL(`${KIS_BASE_URL}/uapi/overseas-stock/v1/ranking/updown-rate`);
  url.searchParams.append('EXCD', exchange);
  url.searchParams.append('NDAY', '0');      // 0: 당일
  url.searchParams.append('GUBN', sortCode); // 0: 하락, 1: 상승
  url.searchParams.append('VOL_RANG', '0');  // 0: 전체
  url.searchParams.append('AUTH', '');
  url.searchParams.append('KEYB', '');

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: getCommonHeaders(accessToken, 'HHDFS76290000'),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[KIS API] 해외주식 등락률순위 조회 실패:', errorText);

    if (response.status === 401) {
      clearTokenCache();
      throw new Error('인증 토큰이 만료되었습니다. 다시 시도해주세요.');
    }

    throw new Error(`해외주식 등락률순위 조회 실패: ${response.status}`);
  }

  const data: KISOverseasFluctuationRankingResponse = await response.json();

  if (data.rt_cd !== '0') {
    console.error('[KIS API] API 에러:', data.msg1);
    throw new Error(`API 에러: ${data.msg1} (${data.msg_cd})`);
  }

  // output이 없거나 빈 배열인 경우 빈 배열 반환
  if (!data.output || !Array.isArray(data.output)) {
    console.warn('[KIS API] 해외주식 등락률순위 데이터가 없습니다.');
    return [];
  }

  return data.output.map((item, index) => transformOverseasFluctuationRanking(item, index + 1, exchange));
}

/**
 * 해외주식 등락률순위 데이터 변환
 */
function transformOverseasFluctuationRanking(
  raw: KISOverseasFluctuationRankingItem,
  rank: number,
  exchange: OverseasExchangeCode
): OverseasFluctuationRankingData {
  return {
    rank,
    symbol: raw.symb,
    name: raw.name,
    exchange,
    currentPrice: parseFloat(raw.last) || 0,
    change: parseFloat(raw.diff) || 0,
    changePercent: parseFloat(raw.rate) || 0,
    changeSign: getOverseasChangeSign(raw.sign),
    volume: parseInt(raw.tvol) || 0,
    previousClose: parseFloat(raw.base) || 0,
  };
}
