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
 * 토큰 캐싱 전략 (Vercel 서버리스 대응):
 * 1. Upstash Redis: 모든 서버리스 인스턴스가 토큰 공유 (권장)
 * 2. 파일 캐시: 로컬 개발 환경용 백업
 * 3. 메모리 캐시: 같은 인스턴스 내 빠른 접근
 *
 * 환경변수 (.env.local):
 * - KIS_APP_KEY: 앱키 (Open API 포털에서 발급)
 * - KIS_APP_SECRET: 앱시크릿 (Open API 포털에서 발급)
 * - KIS_ACCOUNT_NO: 계좌번호 (8자리)
 * - KIS_PROD_CODE: 상품코드 (01: 주식, 02: 선물옵션 등)
 * - KIS_BASE_URL: API 기본 URL
 * - UPSTASH_REDIS_REST_URL: Upstash Redis URL (Vercel 환경)
 * - UPSTASH_REDIS_REST_TOKEN: Upstash Redis 토큰 (Vercel 환경)
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

import {
  getCachedToken,
  saveToken,
  clearTokenCache as clearRedisTokenCache,
  acquireTokenLock,
  releaseTokenLock,
  waitForTokenLock,
  isRedisAvailable,
} from './token-cache';

// ==================== 환경변수 ====================

const KIS_APP_KEY = process.env.KIS_APP_KEY;
const KIS_APP_SECRET = process.env.KIS_APP_SECRET;
const KIS_ACCOUNT_NO = process.env.KIS_ACCOUNT_NO;
const KIS_PROD_CODE = process.env.KIS_PROD_CODE || '01';
const KIS_BASE_URL = process.env.KIS_BASE_URL || 'https://openapi.koreainvestment.com:9443';

// ==================== 토큰 캐싱 (메모리 + Redis) ====================

/**
 * 메모리 토큰 캐시 (같은 인스턴스 내 빠른 접근)
 */
let memoryTokenCache: CachedToken | null = null;

/**
 * 토큰 발급 진행 중인 Promise (같은 인스턴스 내 동시 요청 방지)
 */
let tokenPromise: Promise<string> | null = null;

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
 * 캐시된 토큰이 유효한지 확인 (메모리 → Redis 순서)
 *
 * @returns 유효한 토큰이 있으면 토큰 문자열, 없으면 null
 */
async function getCachedTokenIfValid(): Promise<string | null> {
  const now = new Date();
  const bufferTime = 10 * 60 * 1000; // 10분 버퍼 (만료 10분 전에 갱신)

  // 1단계: 메모리 캐시 확인 (가장 빠름)
  if (memoryTokenCache) {
    if (memoryTokenCache.expiresAt.getTime() - bufferTime > now.getTime()) {
      console.log('[KIS API] 메모리 캐시 토큰 사용');
      return memoryTokenCache.accessToken;
    }
    console.log('[KIS API] 메모리 캐시 토큰 만료 임박');
  }

  // 2단계: Redis/파일 캐시 확인
  try {
    const cachedTokenData = await getCachedToken();
    if (cachedTokenData) {
      // 캐시를 메모리에도 복원
      memoryTokenCache = cachedTokenData;
      console.log('[KIS API] Redis/파일 캐시에서 토큰 복원 성공');
      return cachedTokenData.accessToken;
    }
  } catch (error) {
    console.error('[KIS API] 캐시 조회 실패:', error);
  }

  return null;
}

/**
 * 실제 토큰 발급 수행 (내부 함수)
 *
 * @description
 * 한국투자증권 OAuth2 토큰 발급 API를 호출합니다.
 * Redis 분산 락을 사용하여 여러 인스턴스의 동시 발급을 방지합니다.
 *
 * @returns 접근토큰
 * @throws 토큰 발급 실패 시 에러
 */
async function fetchNewToken(): Promise<string> {
  console.log('[KIS API] 새 토큰 발급 시도...');

  // Redis 분산 락 획득 시도
  const lockAcquired = await acquireTokenLock(30);

  if (!lockAcquired) {
    // 다른 인스턴스가 토큰 발급 중 - 대기 후 캐시 확인
    console.log('[KIS API] 다른 인스턴스가 토큰 발급 중, 대기...');
    await waitForTokenLock(10000, 500);

    // 대기 후 캐시 확인
    const cachedTokenData = await getCachedToken();
    if (cachedTokenData) {
      memoryTokenCache = cachedTokenData;
      console.log('[KIS API] 대기 후 캐시에서 토큰 발견');
      return cachedTokenData.accessToken;
    }

    // 캐시에 없으면 직접 발급 시도
    console.log('[KIS API] 캐시에 토큰 없음, 직접 발급 시도...');
  }

  try {
    console.log('[KIS API] 한투 API에 토큰 요청 중...');
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

      // Rate limit 에러 시 캐시 다시 확인 (다른 인스턴스가 발급했을 수 있음)
      if (errorText.includes('EGW00133')) {
        console.log('[KIS API] Rate limit 에러, 캐시 재확인...');
        await new Promise(resolve => setTimeout(resolve, 2000));

        const cachedTokenData = await getCachedToken();
        if (cachedTokenData) {
          memoryTokenCache = cachedTokenData;
          console.log('[KIS API] Rate limit 후 캐시에서 토큰 발견');
          return cachedTokenData.accessToken;
        }
      }

      throw new Error(`토큰 발급 실패 (Rate Limit): ${response.status} ${errorText}`);
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[KIS API] 토큰 발급 실패:', errorText);
      throw new Error(`토큰 발급 실패: ${response.status} ${errorText}`);
    }

    const data: KISTokenResponse = await response.json();

    // 토큰 캐싱 (메모리 + Redis + 파일)
    const expiresAt = new Date(Date.now() + data.expires_in * 1000);
    const tokenData: CachedToken = {
      accessToken: data.access_token,
      expiresAt,
    };

    // 메모리 캐시 업데이트
    memoryTokenCache = tokenData;

    // Redis/파일에 저장
    await saveToken(tokenData);

    console.log(`[KIS API] 토큰 발급 완료, 만료: ${expiresAt.toISOString()}, Redis: ${isRedisAvailable()}`);

    return data.access_token;
  } finally {
    // 분산 락 해제
    await releaseTokenLock();
  }
}

/**
 * 접근토큰 발급 (Redis 분산 락 + 재시도 포함)
 *
 * @description
 * POST /oauth2/tokenP 엔드포인트로 토큰 발급
 * - 토큰은 24시간(86400초) 유효
 * - 1분당 1회 발급 제한이 있으므로 캐싱 필수
 * - Redis 분산 락으로 여러 서버리스 인스턴스 간 동시 발급 방지
 *
 * Vercel 서버리스 환경 고려사항:
 * - Upstash Redis를 통해 모든 인스턴스가 토큰 공유
 * - 분산 락으로 동시 발급 요청 방지
 * - Rate Limit 에러 시 캐시 재확인 후 재시도
 *
 * 동작 흐름:
 * 1. 캐시된 토큰이 유효하면 즉시 반환 (메모리 → Redis)
 * 2. 분산 락 획득 시도
 * 3. 락 획득 실패 시 대기 후 캐시 확인
 * 4. 토큰 발급 후 Redis에 저장
 *
 * @param retryCount 재시도 횟수 (내부용)
 * @returns 접근토큰
 * @throws 토큰 발급 실패 시 에러
 */
export async function getAccessToken(retryCount: number = 0): Promise<string> {
  validateEnv();

  // 1단계: 캐시된 토큰이 유효하면 즉시 반환
  const cachedToken = await getCachedTokenIfValid();
  if (cachedToken) {
    return cachedToken;
  }

  // 2단계: 같은 인스턴스 내 동시 요청 처리
  if (tokenPromise) {
    console.log('[KIS API] 같은 인스턴스 내 다른 요청이 토큰 발급 중, 대기...');
    try {
      return await tokenPromise;
    } catch {
      // 다른 요청이 실패해도 캐시된 토큰이 있으면 사용
      if (memoryTokenCache) {
        console.log('[KIS API] 토큰 발급 실패, 기존 토큰 사용');
        return memoryTokenCache.accessToken;
      }
      throw new Error('토큰 발급 대기 중 에러 발생');
    }
  }

  // 3단계: 토큰 발급 시작 (첫 번째 요청만)
  tokenPromise = fetchNewToken()
    .catch(async (error) => {
      // Rate limit 에러 시 재시도
      if (error.message?.includes('Rate Limit') && retryCount < 3) {
        console.log(`[KIS API] 토큰 발급 Rate Limit 에러, ${(retryCount + 1) * 2}초 후 재시도...`);
        await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 2000));

        // Redis/파일 캐시 다시 확인 (다른 인스턴스가 저장했을 수 있음)
        const cachedTokenData = await getCachedToken();
        if (cachedTokenData) {
          memoryTokenCache = cachedTokenData;
          console.log('[KIS API] Rate Limit 에러 후 캐시에서 토큰 발견');
          return cachedTokenData.accessToken;
        }

        // 재시도
        tokenPromise = null;
        return getAccessToken(retryCount + 1);
      }
      throw error;
    })
    .finally(() => {
      // 발급 완료 후 Promise 초기화
      tokenPromise = null;
    });

  return tokenPromise;
}

/**
 * 토큰 캐시 강제 초기화
 *
 * @description
 * 토큰이 유효하지 않을 때 (401 에러 등) 사용합니다.
 * 메모리, Redis, 파일 캐시를 모두 초기화합니다.
 */
export async function clearTokenCache(): Promise<void> {
  // 메모리 캐시 초기화
  memoryTokenCache = null;
  tokenPromise = null;

  // Redis/파일 캐시 삭제
  await clearRedisTokenCache();

  console.log('[KIS API] 토큰 캐시 초기화됨 (메모리, Redis, 파일 모두 초기화)');
}

/**
 * 토큰 캐시 상태 확인 (디버깅용)
 *
 * @returns 토큰 캐시 상태 정보
 */
export function getTokenCacheStatus(): {
  hasToken: boolean;
  expiresAt: Date | null;
  isPending: boolean;
  isRedisAvailable: boolean;
} {
  return {
    hasToken: !!memoryTokenCache,
    expiresAt: memoryTokenCache?.expiresAt || null,
    isPending: !!tokenPromise,
    isRedisAvailable: isRedisAvailable(),
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

    // 토큰 만료 에러 체크 (401 또는 EGW00123 에러코드)
    // 한투 API는 토큰 만료 시 500과 함께 EGW00123을 반환하기도 함
    if (priceResponse.status === 401 || errorText.includes('EGW00123') || errorText.includes('만료된 token')) {
      console.log('[KIS API] 토큰 만료 감지, 캐시 초기화');
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
    if (response.status === 401 || errorText.includes('EGW00123') || errorText.includes('만료된 token')) {
      console.log('[KIS API] 토큰 만료 감지, 캐시 초기화');
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

    if (response.status === 401 || errorText.includes('EGW00123') || errorText.includes('만료된 token')) {
      console.log('[KIS API] 토큰 만료 감지, 캐시 초기화');
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

    if (response.status === 401 || errorText.includes('EGW00123') || errorText.includes('만료된 token')) {
      console.log('[KIS API] 토큰 만료 감지, 캐시 초기화');
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
 *
 * @description
 * KIS API 응답에서 종목코드 필드명이 다를 수 있음:
 * - mksc_shrn_iscd: 단축종목코드 (일반적)
 * - stck_shrn_iscd: 주식단축종목코드 (일부 API)
 */
function transformFluctuationRanking(raw: KISFluctuationRankingItem, defaultRank: number): FluctuationRankingData {
  // 종목코드 필드 fallback (여러 필드명 대응)
  const symbol = raw.mksc_shrn_iscd || raw.stck_shrn_iscd || raw['stck_shrn_iscd'] || '';

  return {
    rank: parseInt(raw.data_rank) || defaultRank,
    symbol,
    name: raw.hts_kor_isnm || '',
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

    if (response.status === 401 || errorText.includes('EGW00123') || errorText.includes('만료된 token')) {
      console.log('[KIS API] 토큰 만료 감지, 캐시 초기화');
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

    if (response.status === 401 || errorText.includes('EGW00123') || errorText.includes('만료된 token')) {
      console.log('[KIS API] 토큰 만료 감지, 캐시 초기화');
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

    if (response.status === 401 || errorText.includes('EGW00123') || errorText.includes('만료된 token')) {
      console.log('[KIS API] 토큰 만료 감지, 캐시 초기화');
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

    if (response.status === 401 || errorText.includes('EGW00123') || errorText.includes('만료된 token')) {
      console.log('[KIS API] 토큰 만료 감지, 캐시 초기화');
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

    if (response.status === 401 || errorText.includes('EGW00123') || errorText.includes('만료된 token')) {
      console.log('[KIS API] 토큰 만료 감지, 캐시 초기화');
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

    if (response.status === 401 || errorText.includes('EGW00123') || errorText.includes('만료된 token')) {
      console.log('[KIS API] 토큰 만료 감지, 캐시 초기화');
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

// ==================== 일봉 차트 데이터 조회 ====================

/**
 * 캔들(일봉) 데이터 타입
 *
 * TradingView Lightweight Charts에서 사용하는 형식
 */
export interface CandleData {
  /** 날짜 (YYYY-MM-DD 형식) */
  time: string;
  /** 시가 */
  open: number;
  /** 고가 */
  high: number;
  /** 저가 */
  low: number;
  /** 종가 */
  close: number;
  /** 거래량 */
  volume: number;
}

/**
 * 한국투자증권 일봉 조회 API 응답 타입
 *
 * tr_id: FHKST03010100
 * @see https://apiportal.koreainvestment.com/apiservice/apiservice-domestic-stock-quotations
 */
interface KISDailyChartResponse {
  rt_cd: string;
  msg_cd: string;
  msg1: string;
  output1?: {
    stck_shrn_iscd: string;  // 종목코드
    hts_kor_isnm: string;    // 종목명
  };
  output2?: Array<{
    stck_bsop_date: string;  // 영업일자 (YYYYMMDD)
    stck_oprc: string;       // 시가
    stck_hgpr: string;       // 고가
    stck_lwpr: string;       // 저가
    stck_clpr: string;       // 종가
    acml_vol: string;        // 누적거래량
    acml_tr_pbmn: string;    // 누적거래대금
  }>;
}

/**
 * 국내주식 일봉 차트 데이터 조회
 *
 * @param symbol 종목코드 (6자리 숫자)
 * @param period 조회 기간 ('D': 일, 'W': 주, 'M': 월)
 * @param count 조회 개수 (최대 100)
 * @returns 캔들 데이터 배열 (과거 → 현재 순서)
 *
 * @description
 * GET /uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice
 * tr_id: FHKST03010100
 *
 * @see https://apiportal.koreainvestment.com/apiservice/apiservice-domestic-stock-quotations
 */
export async function getKoreanDailyChart(
  symbol: string,
  period: 'D' | 'W' | 'M' = 'D',
  count: number = 100
): Promise<CandleData[]> {
  const accessToken = await getAccessToken();

  // 조회 종료일 (오늘)
  const today = new Date();
  const endDate = today.toISOString().slice(0, 10).replace(/-/g, '');

  // 조회 시작일 (count일 전)
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - count * 2);  // 넉넉하게 2배로 조회
  const startDateStr = startDate.toISOString().slice(0, 10).replace(/-/g, '');

  const url = new URL(`${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice`);
  url.searchParams.append('FID_COND_MRKT_DIV_CODE', 'J');      // J: 주식
  url.searchParams.append('FID_INPUT_ISCD', symbol);           // 종목코드
  url.searchParams.append('FID_INPUT_DATE_1', startDateStr);   // 시작일
  url.searchParams.append('FID_INPUT_DATE_2', endDate);        // 종료일
  url.searchParams.append('FID_PERIOD_DIV_CODE', period);      // D: 일, W: 주, M: 월
  url.searchParams.append('FID_ORG_ADJ_PRC', '0');             // 0: 수정주가, 1: 원주가

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: getCommonHeaders(accessToken, 'FHKST03010100'),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[KIS API] 일봉 조회 실패:', response.status, errorText);

    if (response.status === 401 || errorText.includes('EGW00123') || errorText.includes('만료된 token')) {
      console.log('[KIS API] 토큰 만료 감지, 캐시 초기화');
      clearTokenCache();
      throw new Error('인증 토큰이 만료되었습니다. 다시 시도해주세요.');
    }

    throw new Error(`일봉 조회 실패: ${response.status}`);
  }

  const data: KISDailyChartResponse = await response.json();

  if (data.rt_cd !== '0') {
    console.error('[KIS API] API 에러:', data.msg1);
    throw new Error(`API 에러: ${data.msg1} (${data.msg_cd})`);
  }

  // output2가 없거나 빈 배열인 경우 빈 배열 반환
  if (!data.output2 || !Array.isArray(data.output2)) {
    console.warn('[KIS API] 일봉 데이터가 없습니다.');
    return [];
  }

  // 데이터 변환 (과거 → 현재 순서로 정렬)
  const candles = data.output2
    .map((item) => ({
      time: `${item.stck_bsop_date.slice(0, 4)}-${item.stck_bsop_date.slice(4, 6)}-${item.stck_bsop_date.slice(6, 8)}`,
      open: parseInt(item.stck_oprc) || 0,
      high: parseInt(item.stck_hgpr) || 0,
      low: parseInt(item.stck_lwpr) || 0,
      close: parseInt(item.stck_clpr) || 0,
      volume: parseInt(item.acml_vol) || 0,
    }))
    .filter((candle) => candle.open > 0)  // 유효한 데이터만
    .reverse()  // 과거 → 현재 순서로 변경
    .slice(-count);  // 요청한 개수만큼

  return candles;
}

/**
 * 해외주식 일봉 차트 데이터 조회
 *
 * @param symbol 종목 심볼 (예: AAPL, TSLA)
 * @param exchange 거래소 코드 (NAS, NYS, AMS)
 * @param period 조회 기간 ('0': 일, '1': 주, '2': 월)
 * @param count 조회 개수 (최대 100)
 * @returns 캔들 데이터 배열 (과거 → 현재 순서)
 *
 * @description
 * GET /uapi/overseas-price/v1/quotations/dailyprice
 * tr_id: HHDFS76240000
 *
 * @see https://apiportal.koreainvestment.com/apiservice/apiservice-oversea-stock-quotations
 */
export async function getOverseasDailyChart(
  symbol: string,
  exchange: 'NAS' | 'NYS' | 'AMS' = 'NAS',
  period: '0' | '1' | '2' = '0',
  count: number = 100
): Promise<CandleData[]> {
  const accessToken = await getAccessToken();

  // 조회 종료일 (오늘)
  const today = new Date();
  const endDate = today.toISOString().slice(0, 10).replace(/-/g, '');

  // 해외주식 기간별시세 API 파라미터 설정
  // @see https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/overseas_stock/dailyprice
  const url = new URL(`${KIS_BASE_URL}/uapi/overseas-price/v1/quotations/dailyprice`);
  url.searchParams.append('AUTH', '');                          // 사용자권한정보 (필수, 빈 값)
  url.searchParams.append('EXCD', exchange);                    // 거래소코드: NAS, NYS, AMS
  url.searchParams.append('SYMB', symbol.toUpperCase());        // 종목코드
  url.searchParams.append('GUBN', period);                      // 0: 일, 1: 주, 2: 월
  url.searchParams.append('BYMD', endDate);                     // 조회기준일자 (YYYYMMDD)
  url.searchParams.append('MODP', '0');                         // 수정주가반영여부: 0

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: getCommonHeaders(accessToken, 'HHDFS76240000'),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[KIS API] 해외 일봉 조회 실패:', response.status, errorText);

    if (response.status === 401 || errorText.includes('EGW00123') || errorText.includes('만료된 token')) {
      console.log('[KIS API] 토큰 만료 감지, 캐시 초기화');
      clearTokenCache();
      throw new Error('인증 토큰이 만료되었습니다. 다시 시도해주세요.');
    }

    throw new Error(`해외 일봉 조회 실패: ${response.status}`);
  }

  const data = await response.json();

  if (data.rt_cd !== '0') {
    console.error('[KIS API] API 에러:', data.msg1);
    throw new Error(`API 에러: ${data.msg1} (${data.msg_cd})`);
  }

  // output2가 없거나 빈 배열인 경우 빈 배열 반환
  if (!data.output2 || !Array.isArray(data.output2)) {
    console.warn('[KIS API] 해외 일봉 데이터가 없습니다.');
    return [];
  }

  // 데이터 변환 (과거 → 현재 순서로 정렬)
  const candles = data.output2
    .map((item: { xymd: string; open: string; high: string; low: string; clos: string; tvol: string }) => ({
      time: `${item.xymd.slice(0, 4)}-${item.xymd.slice(4, 6)}-${item.xymd.slice(6, 8)}`,
      open: parseFloat(item.open) || 0,
      high: parseFloat(item.high) || 0,
      low: parseFloat(item.low) || 0,
      close: parseFloat(item.clos) || 0,
      volume: parseInt(item.tvol) || 0,
    }))
    .filter((candle: CandleData) => candle.open > 0)  // 유효한 데이터만
    .reverse()  // 과거 → 현재 순서로 변경
    .slice(-count);  // 요청한 개수만큼

  return candles;
}
