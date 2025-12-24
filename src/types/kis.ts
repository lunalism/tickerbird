/**
 * 한국투자증권 Open API 타입 정의
 *
 * @see https://apiportal.koreainvestment.com - 한국투자증권 Open API 포털
 * @see https://github.com/koreainvestment/open-trading-api - 공식 GitHub 샘플코드
 *
 * 주요 API 문서:
 * - 접근토큰 발급: https://apiportal.koreainvestment.com/apiservice/oauth2#L_5c87ba63-740a-4166-93ac-803510f9571d
 * - 주식현재가 시세: https://apiportal.koreainvestment.com/apiservice/apiservice-domestic-stock-quotations#L_07802512-4f49-4486-91b4-1050b6f5dc9d
 * - 국내주식 업종기간별시세: https://apiportal.koreainvestment.com/apiservice/apiservice-domestic-stock-quotations#L_2e6c2cb5-7aa5-42c8-bb2a-e36ab0e3db71
 */

// ==================== 토큰 관련 타입 ====================

/**
 * 접근토큰 발급 요청 바디
 * POST /oauth2/tokenP
 */
export interface KISTokenRequest {
  grant_type: 'client_credentials';  // 고정값
  appkey: string;                    // 앱키 (36자리)
  appsecret: string;                 // 앱시크릿 (180자리)
}

/**
 * 접근토큰 발급 응답
 * - access_token: API 호출 시 사용할 토큰
 * - token_type: Bearer (고정)
 * - expires_in: 토큰 유효기간 (초 단위, 보통 86400 = 24시간)
 * - access_token_token_expired: 토큰 만료 시간 (YYYY-MM-DD HH:mm:ss 형식)
 */
export interface KISTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  access_token_token_expired: string;
}

/**
 * 캐싱된 토큰 정보 (내부 관리용)
 */
export interface CachedToken {
  accessToken: string;
  expiresAt: Date;
}

// ==================== API 공통 타입 ====================

/**
 * 한국투자증권 API 공통 응답 헤더
 * 모든 API 응답에 포함됨
 */
export interface KISApiResponseHeader {
  tr_id: string;          // 거래ID
  tr_cont: string;        // 연속거래 여부 (N: 없음, F: 다음 데이터 있음, M: 다음 데이터 있음)
  gt_uid: string;         // Global UID
}

/**
 * 한국투자증권 API 공통 에러 응답
 */
export interface KISApiError {
  rt_cd: string;    // 결과코드 (0: 성공, 그 외: 실패)
  msg_cd: string;   // 메시지코드
  msg1: string;     // 응답메시지
}

// ==================== 주식 현재가 조회 타입 ====================

/**
 * 주식 현재가 조회 API 응답
 * GET /uapi/domestic-stock/v1/quotations/inquire-price
 * tr_id: FHKST01010100
 *
 * @description
 * FID_COND_MRKT_DIV_CODE: J (주식/ETF/ETN), U (업종)
 * FID_INPUT_ISCD: 종목코드 (예: 005930 삼성전자)
 */
export interface KISStockPriceResponse {
  rt_cd: string;     // 성공 실패 여부 (0: 성공)
  msg_cd: string;    // 응답코드
  msg1: string;      // 응답메시지
  output: KISStockPrice;
}

/**
 * 주식 현재가 상세 정보
 *
 * @see 필드 설명: https://apiportal.koreainvestment.com/apiservice/apiservice-domestic-stock-quotations
 *
 * 주요 필드:
 * - stck_prpr: 주식 현재가
 * - prdy_vrss: 전일 대비
 * - prdy_vrss_sign: 전일 대비 부호 (1:상한, 2:상승, 3:보합, 4:하한, 5:하락)
 * - prdy_ctrt: 전일 대비율 (%)
 * - acml_vol: 누적 거래량
 * - acml_tr_pbmn: 누적 거래대금
 * - stck_oprc: 시가
 * - stck_hgpr: 고가
 * - stck_lwpr: 저가
 */
export interface KISStockPrice {
  // 기본 시세 정보
  stck_prpr: string;      // 주식 현재가
  prdy_vrss: string;      // 전일 대비
  prdy_vrss_sign: string; // 전일 대비 부호 (1:상한, 2:상승, 3:보합, 4:하한, 5:하락)
  prdy_ctrt: string;      // 전일 대비율 (%)

  // 거래 정보
  acml_vol: string;       // 누적 거래량
  acml_tr_pbmn: string;   // 누적 거래대금

  // OHLC (시가/고가/저가/종가)
  stck_oprc: string;      // 시가
  stck_hgpr: string;      // 고가
  stck_lwpr: string;      // 저가

  // 52주 고저
  stck_mxpr: string;      // 상한가
  stck_llam: string;      // 하한가
  w52_hgpr: string;       // 52주 최고가
  w52_lwpr: string;       // 52주 최저가

  // 기타 정보
  per: string;            // PER (주가수익비율)
  pbr: string;            // PBR (주가순자산비율)
  eps: string;            // EPS (주당순이익)
  bps: string;            // BPS (주당순자산)

  // 시장 정보
  iscd_stat_cls_code: string;  // 종목 상태 구분 코드
  rprs_mrkt_kor_name: string;  // 대표 시장 한글명

  // 호가/체결 정보
  askp: string;           // 매도호가
  bidp: string;           // 매수호가
  total_askp_rsqn: string; // 총 매도호가 잔량
  total_bidp_rsqn: string; // 총 매수호가 잔량

  // 기타 추가 필드들 (API 응답에 포함되지만 주요하지 않은 필드)
  [key: string]: string;
}

// ==================== 지수 현재가 조회 타입 ====================

/**
 * 지수(업종) 현재가 조회 API 응답
 * GET /uapi/domestic-stock/v1/quotations/inquire-index-price
 * tr_id: FHPUP02100000
 *
 * @description
 * FID_COND_MRKT_DIV_CODE: U (업종)
 * FID_INPUT_ISCD: 업종코드
 *   - 0001: 코스피
 *   - 1001: 코스닥
 *   - 2001: 코스피200
 */
export interface KISIndexPriceResponse {
  rt_cd: string;     // 성공 실패 여부 (0: 성공)
  msg_cd: string;    // 응답코드
  msg1: string;      // 응답메시지
  output: KISIndexPrice;
}

/**
 * 지수 현재가 상세 정보
 */
export interface KISIndexPrice {
  // 기본 시세 정보
  bstp_nmix_prpr: string;      // 업종 지수 현재가
  bstp_nmix_prdy_vrss: string; // 업종 지수 전일 대비
  prdy_vrss_sign: string;      // 전일 대비 부호 (1:상한, 2:상승, 3:보합, 4:하한, 5:하락)
  bstp_nmix_prdy_ctrt: string; // 업종 지수 전일 대비율 (%)

  // 거래 정보
  acml_vol: string;            // 누적 거래량
  acml_tr_pbmn: string;        // 누적 거래대금

  // OHLC
  bstp_nmix_oprc: string;      // 업종 지수 시가
  bstp_nmix_hgpr: string;      // 업종 지수 고가
  bstp_nmix_lwpr: string;      // 업종 지수 저가

  // 기타 추가 필드들
  [key: string]: string;
}

// ==================== 클라이언트용 정제된 타입 ====================

/**
 * 클라이언트에 반환할 주식 현재가 정보 (정제된 형태)
 */
export interface StockPriceData {
  symbol: string;           // 종목코드
  currentPrice: number;     // 현재가
  change: number;           // 전일 대비
  changePercent: number;    // 전일 대비율 (%)
  changeSign: string;       // 등락 부호 (up, down, flat)
  volume: number;           // 거래량
  tradingValue: number;     // 거래대금
  open: number;             // 시가
  high: number;             // 고가
  low: number;              // 저가
  high52w: number;          // 52주 최고가
  low52w: number;           // 52주 최저가
  per: number;              // PER
  pbr: number;              // PBR
  eps: number;              // EPS
  marketName: string;       // 시장명 (KOSPI, KOSDAQ 등)
  timestamp: string;        // 조회 시간
}

/**
 * 클라이언트에 반환할 지수 현재가 정보 (정제된 형태)
 */
export interface IndexPriceData {
  indexCode: string;        // 지수코드
  indexName: string;        // 지수명
  currentValue: number;     // 현재 지수
  change: number;           // 전일 대비
  changePercent: number;    // 전일 대비율 (%)
  changeSign: string;       // 등락 부호 (up, down, flat)
  volume: number;           // 거래량
  tradingValue: number;     // 거래대금
  open: number;             // 시가
  high: number;             // 고가
  low: number;              // 저가
  timestamp: string;        // 조회 시간
}

// ==================== API 에러 타입 ====================

/**
 * KIS API 호출 시 발생할 수 있는 에러 타입
 */
export interface KISApiErrorResponse {
  error: string;
  message: string;
  code?: string;
}
