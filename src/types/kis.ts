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
  stockName?: string;       // 종목명 (선택사항)
  currentPrice: number;     // 현재가
  change: number;           // 전일 대비
  changePercent: number;    // 전일 대비율 (%)
  changeSign: string;       // 등락 부호 (up, down, flat)
  volume: number;           // 거래량
  tradingValue?: number;    // 거래대금 (선택사항)
  openPrice: number;        // 시가
  highPrice: number;        // 고가
  lowPrice: number;         // 저가
  high52w?: number;         // 52주 최고가 (선택사항)
  low52w?: number;          // 52주 최저가 (선택사항)
  per?: number;             // PER (선택사항)
  pbr?: number;             // PBR (선택사항)
  eps?: number;             // EPS (선택사항)
  marketName?: string;      // 시장명 (KOSPI, KOSDAQ 등)
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

// ==================== 순위 조회 API 타입 ====================
// @see https://apiportal.koreainvestment.com/apiservice/apiservice-domestic-stock-ranking

/**
 * 거래량순위 API 응답
 * GET /uapi/domestic-stock/v1/quotations/volume-rank
 * tr_id: FHPST01710000
 *
 * @description
 * 한국투자 HTS(eFriend Plus) > [0171] 거래량 순위 화면의 기능을 API로 개발한 사항
 * 최대 30건 확인 가능, 다음 조회 불가
 *
 * 파라미터 (FID 필드):
 * - FID_COND_MRKT_DIV_CODE: 시장구분코드 (J: 주식/ETF/ETN)
 * - FID_COND_SCR_DIV_CODE: 조건화면분류코드 (20171: 거래량순위)
 * - FID_INPUT_ISCD: 입력종목코드 (0000: 전체, 0001: 코스피, 1001: 코스닥)
 * - FID_DIV_CLS_CODE: 분류구분코드 (0: 전체, 1: 보통주, 2: 우선주)
 * - FID_BLNG_CLS_CODE: 소속구분코드 (0: 평균거래량, 1: 거래증가율, 2: 평균거래회전율, 3: 거래금액순, 4: 평균거래금액회전율)
 * - FID_TRGT_CLS_CODE: 대상구분코드 (111111111: 전체, 첫번째부터 관리/투자주의/정리매매/불성실공시/우선주/거래정지/ETF/ETN/REITs)
 * - FID_TRGT_EXLS_CLS_CODE: 대상제외구분코드 (000000: 없음)
 * - FID_INPUT_PRICE_1: 입력가격1 (최저가격, 0: 전체)
 * - FID_INPUT_PRICE_2: 입력가격2 (최고가격, 0: 전체)
 * - FID_VOL_CNT: 거래량수 (0: 전체)
 * - FID_INPUT_DATE_1: 입력날짜1 (0: 전체, 기간(일) 설정 가능)
 */
export interface KISVolumeRankingResponse {
  rt_cd: string;     // 성공 실패 여부 (0: 성공)
  msg_cd: string;    // 응답코드
  msg1: string;      // 응답메시지
  output: KISVolumeRankingItem[];
}

/**
 * 거래량순위 개별 종목 데이터
 *
 * 주요 필드:
 * - hts_kor_isnm: 종목명
 * - mksc_shrn_iscd: 단축종목코드 (6자리)
 * - stck_prpr: 현재가
 * - prdy_vrss: 전일대비
 * - prdy_vrss_sign: 전일대비부호 (1:상한, 2:상승, 3:보합, 4:하한, 5:하락)
 * - prdy_ctrt: 전일대비율 (%)
 * - acml_vol: 누적거래량
 * - acml_tr_pbmn: 누적거래대금
 * - vol_inrt: 거래량증가율
 * - vol_tnrt: 거래량회전율
 */
export interface KISVolumeRankingItem {
  hts_kor_isnm: string;     // 종목명
  mksc_shrn_iscd: string;   // 단축종목코드 (6자리)
  data_rank: string;        // 데이터 순위
  stck_prpr: string;        // 현재가
  prdy_vrss: string;        // 전일대비
  prdy_vrss_sign: string;   // 전일대비부호
  prdy_ctrt: string;        // 전일대비율 (%)
  acml_vol: string;         // 누적거래량
  prdy_vol: string;         // 전일거래량
  lstn_stcn: string;        // 상장주수
  avrg_vol: string;         // 평균거래량
  n_befr_clpr_vrss_prpr_rate: string;  // N일전종가대비현재가비율
  vol_inrt: string;         // 거래량증가율
  vol_tnrt: string;         // 거래량회전율
  nday_vol_tnrt: string;    // N일거래량회전율
  avrg_tr_pbmn: string;     // 평균거래대금
  tr_pbmn_tnrt: string;     // 거래대금회전율
  nday_tr_pbmn_tnrt: string; // N일거래대금회전율
  acml_tr_pbmn: string;     // 누적거래대금
  [key: string]: string;
}

/**
 * 등락률순위 API 응답
 * GET /uapi/domestic-stock/v1/ranking/fluctuation
 * tr_id: FHPST01700000
 *
 * @description
 * 한국투자 HTS(eFriend Plus) > [0170] 등락률 순위 화면의 기능을 API로 개발한 사항
 * 최대 30건 확인 가능, 다음 조회 불가
 *
 * 파라미터 (FID 필드):
 * - FID_COND_MRKT_DIV_CODE: 시장구분코드 (J: 주식/ETF/ETN)
 * - FID_COND_SCR_DIV_CODE: 조건화면분류코드 (20170: 등락률순위)
 * - FID_INPUT_ISCD: 입력종목코드 (0000: 전체, 0001: 코스피, 1001: 코스닥)
 * - FID_RANK_SORT_CLS_CODE: 순위정렬구분코드 (0: 상승률순, 1: 하락률순)
 * - FID_PRC_CLS_CODE: 가격구분코드 (0: 저가대비, 1: 시가대비, 2: 전일대비)
 * - FID_DIV_CLS_CODE: 분류구분코드 (0: 전체, 1: 보통주, 2: 우선주)
 * - FID_TRGT_CLS_CODE: 대상구분코드 (111111111)
 * - FID_TRGT_EXLS_CLS_CODE: 대상제외구분코드 (000000)
 * - FID_INPUT_PRICE_1: 입력가격1 (0: 전체)
 * - FID_INPUT_PRICE_2: 입력가격2 (0: 전체)
 * - FID_VOL_CNT: 거래량수 (0: 전체)
 */
export interface KISFluctuationRankingResponse {
  rt_cd: string;     // 성공 실패 여부 (0: 성공)
  msg_cd: string;    // 응답코드
  msg1: string;      // 응답메시지
  output: KISFluctuationRankingItem[];
}

/**
 * 등락률순위 개별 종목 데이터
 */
export interface KISFluctuationRankingItem {
  hts_kor_isnm: string;     // 종목명
  mksc_shrn_iscd: string;   // 단축종목코드 (6자리)
  data_rank: string;        // 데이터 순위
  stck_prpr: string;        // 현재가
  prdy_vrss: string;        // 전일대비
  prdy_vrss_sign: string;   // 전일대비부호
  prdy_ctrt: string;        // 전일대비율 (%)
  acml_vol: string;         // 누적거래량
  acml_tr_pbmn: string;     // 누적거래대금
  stck_hgpr: string;        // 최고가
  hgpr_hour: string;        // 최고가시간
  stck_lwpr: string;        // 최저가
  lwpr_hour: string;        // 최저가시간
  stck_oprc: string;        // 시가
  oprc_vrss_prpr_rate: string;  // 시가대비현재가비율
  lwpr_vrss_prpr_rate: string;  // 저가대비현재가비율
  [key: string]: string;
}

/**
 * 시가총액순위 API 응답
 * GET /uapi/domestic-stock/v1/quotations/market-cap
 * tr_id: FHPST01740000
 *
 * @description
 * 한국투자 HTS(eFriend Plus) > [0174] 시가총액 상위 화면의 기능을 API로 개발한 사항
 * 최대 30건 확인 가능, 다음 조회 불가
 *
 * 파라미터 (FID 필드):
 * - FID_COND_MRKT_DIV_CODE: 시장구분코드 (J: 주식)
 * - FID_COND_SCR_DIV_CODE: 조건화면분류코드 (20174: 시가총액상위)
 * - FID_INPUT_ISCD: 입력종목코드 (0000: 전체, 0001: 코스피, 1001: 코스닥)
 * - FID_DIV_CLS_CODE: 분류구분코드 (0: 전체, 1: 보통주, 2: 우선주)
 */
export interface KISMarketCapRankingResponse {
  rt_cd: string;     // 성공 실패 여부 (0: 성공)
  msg_cd: string;    // 응답코드
  msg1: string;      // 응답메시지
  output: KISMarketCapRankingItem[];
}

/**
 * 시가총액순위 개별 종목 데이터
 */
export interface KISMarketCapRankingItem {
  hts_kor_isnm: string;     // 종목명
  mksc_shrn_iscd: string;   // 단축종목코드 (6자리)
  data_rank: string;        // 데이터 순위
  stck_prpr: string;        // 현재가
  prdy_vrss: string;        // 전일대비
  prdy_vrss_sign: string;   // 전일대비부호
  prdy_ctrt: string;        // 전일대비율 (%)
  acml_vol: string;         // 누적거래량
  lstn_stcn: string;        // 상장주수
  stck_avls: string;        // 시가총액 (억원 단위)
  mrkt_whol_avls_rlim: string;  // 시장전체시가총액비중
  [key: string]: string;
}

// ==================== 클라이언트용 순위 데이터 타입 ====================

/**
 * 클라이언트에 반환할 거래량순위 정보 (정제된 형태)
 */
export interface VolumeRankingData {
  rank: number;             // 순위
  symbol: string;           // 종목코드 (6자리)
  name: string;             // 종목명
  currentPrice: number;     // 현재가
  change: number;           // 전일대비
  changePercent: number;    // 전일대비율 (%)
  changeSign: string;       // 등락부호 (up, down, flat)
  volume: number;           // 거래량
  tradingValue: number;     // 거래대금
  volumeIncreaseRate: number;  // 거래량증가율
}

/**
 * 클라이언트에 반환할 등락률순위 정보 (정제된 형태)
 */
export interface FluctuationRankingData {
  rank: number;             // 순위
  symbol: string;           // 종목코드 (6자리)
  name: string;             // 종목명
  currentPrice: number;     // 현재가
  change: number;           // 전일대비
  changePercent: number;    // 전일대비율 (%)
  changeSign: string;       // 등락부호 (up, down, flat)
  volume: number;           // 거래량
  highPrice: number;        // 고가
  lowPrice: number;         // 저가
  openPrice: number;        // 시가
}

/**
 * 클라이언트에 반환할 시가총액순위 정보 (정제된 형태)
 */
export interface MarketCapRankingData {
  rank: number;             // 순위
  symbol: string;           // 종목코드 (6자리)
  name: string;             // 종목명
  currentPrice: number;     // 현재가
  change: number;           // 전일대비
  changePercent: number;    // 전일대비율 (%)
  changeSign: string;       // 등락부호 (up, down, flat)
  volume: number;           // 거래량
  marketCap: number;        // 시가총액 (억원)
  marketCapRatio: number;   // 시장전체대비비중 (%)
}

// ==================== 해외주식 API 타입 ====================
// @see https://apiportal.koreainvestment.com/apiservice/apiservice-overseas-stock
// @see https://github.com/koreainvestment/open-trading-api/tree/main/examples_llm/overseas_stock

/**
 * 해외 거래소 코드
 * - NYS: 뉴욕 (NYSE)
 * - NAS: 나스닥 (NASDAQ)
 * - AMS: 아멕스 (AMEX)
 * - HKS: 홍콩
 * - TSE: 도쿄
 * - SHS: 상해
 * - SZS: 심천
 * - HSX: 호치민
 * - HNX: 하노이
 */
export type OverseasExchangeCode = 'NYS' | 'NAS' | 'AMS' | 'HKS' | 'TSE' | 'SHS' | 'SZS' | 'HSX' | 'HNX';

/**
 * 해외지수 코드
 * - SPX: S&P 500
 * - CCMP: NASDAQ Composite
 * - INDU: Dow Jones Industrial
 * - RUT: Russell 2000 (소형주 지수)
 */
export type OverseasIndexCode = 'SPX' | 'CCMP' | 'INDU' | 'RUT';

// ==================== 해외주식 현재가 조회 타입 ====================

/**
 * 해외주식 현재가 조회 API 응답
 * GET /uapi/overseas-price/v1/quotations/price
 * tr_id: HHDFS00000300
 *
 * @description
 * 해외주식 시세를 조회합니다.
 * 거래소 운영시간 외 조회 시 에러가 발생할 수 있습니다.
 *
 * 미국 거래소 운영시간 (한국시간):
 * - 정규장: 23:30 ~ 06:00 (썸머타임: 22:30 ~ 05:00)
 */
export interface KISOverseasStockPriceResponse {
  rt_cd: string;     // 성공 실패 여부 (0: 성공)
  msg_cd: string;    // 응답코드
  msg1: string;      // 응답메시지
  output: KISOverseasStockPrice;
}

/**
 * 해외주식 현재가 상세 정보
 */
export interface KISOverseasStockPrice {
  rsym: string;       // 실시간 조회 종목코드
  zdiv: string;       // 소수점 자리수
  base: string;       // 전일종가
  pvol: string;       // 전일거래량
  last: string;       // 현재가
  sign: string;       // 대비기호 (1:상승, 2:보합, 3:하락, 4:상한, 5:하한)
  diff: string;       // 대비 (전일대비)
  rate: string;       // 등락율 (%)
  tvol: string;       // 거래량
  tamt: string;       // 거래대금
  ordy: string;       // 매수가능여부 (Y/N)
  [key: string]: string;
}

/**
 * 클라이언트에 반환할 해외주식 현재가 정보 (정제된 형태)
 */
export interface OverseasStockPriceData {
  symbol: string;           // 종목코드 (예: AAPL)
  exchange: OverseasExchangeCode;  // 거래소코드
  currentPrice: number;     // 현재가
  change: number;           // 전일 대비
  changePercent: number;    // 전일 대비율 (%)
  changeSign: string;       // 등락 부호 (up, down, flat)
  volume: number;           // 거래량
  tradingValue: number;     // 거래대금
  previousClose: number;    // 전일종가
  previousVolume: number;   // 전일거래량
  timestamp: string;        // 조회 시간
}

// ==================== 해외지수 차트 가격 조회 타입 ====================

/**
 * 해외지수 시간별 차트가격 조회 API 응답
 * GET /uapi/overseas-price/v1/quotations/inquire-time-indexchartprice
 * tr_id: FHKST03030200
 *
 * @description
 * 해외 주요 지수의 시간별 차트 가격을 조회합니다.
 * 미국 지수 코드:
 * - SPX: S&P 500
 * - CCMP: NASDAQ Composite
 * - INDU: Dow Jones Industrial Average
 */
export interface KISOverseasIndexChartResponse {
  rt_cd: string;     // 성공 실패 여부 (0: 성공)
  msg_cd: string;    // 응답코드
  msg1: string;      // 응답메시지
  output1: KISOverseasIndexInfo;      // 지수 기본 정보
  output2: KISOverseasIndexChartItem[];  // 시간별 차트 데이터
}

/**
 * 해외지수 기본 정보 (output1)
 */
export interface KISOverseasIndexInfo {
  ovrs_nmix_prdy_vrss: string;    // 해외지수 전일대비
  prdy_vrss_sign: string;          // 전일대비 부호 (1:상승, 2:보합, 3:하락)
  prdy_ctrt: string;               // 전일대비율 (%)
  ovrs_nmix_prpr: string;          // 해외지수 현재가
  [key: string]: string;
}

/**
 * 해외지수 시간별 차트 데이터 (output2)
 */
export interface KISOverseasIndexChartItem {
  stck_bsop_date: string;    // 영업일자 (YYYYMMDD)
  ovrs_nmix_oprc: string;    // 해외지수 시가
  ovrs_nmix_hgpr: string;    // 해외지수 고가
  ovrs_nmix_lwpr: string;    // 해외지수 저가
  ovrs_nmix_prpr: string;    // 해외지수 현재가 (종가)
  acml_vol: string;          // 누적거래량
  mod_yn: string;            // 수정여부
  [key: string]: string;
}

/**
 * 클라이언트에 반환할 해외지수 정보 (정제된 형태)
 */
export interface OverseasIndexData {
  indexCode: OverseasIndexCode;  // 지수코드 (SPX, CCMP, INDU)
  indexName: string;             // 지수명
  currentValue: number;          // 현재 지수
  change: number;                // 전일 대비
  changePercent: number;         // 전일 대비율 (%)
  changeSign: string;            // 등락 부호 (up, down, flat)
  openValue?: number;            // 시가
  highValue?: number;            // 고가
  lowValue?: number;             // 저가
  volume?: number;               // 거래량
  timestamp: string;             // 조회 시간
  isEstimated?: boolean;         // ETF 기반 추정치 여부 (true: ETF 가격으로 추정, false/undefined: 실제 API 데이터)
}

// ==================== 해외주식 순위 조회 API 타입 ====================

/**
 * 해외주식 거래량순위 API 응답
 * GET /uapi/overseas-stock/v1/ranking/trade-vol
 * tr_id: HHDFS76310010
 *
 * @description
 * 해외주식 거래량 순위를 조회합니다.
 *
 * 파라미터:
 * - EXCD: 거래소코드 (NYS, NAS, AMS 등)
 * - NDAY: N일자값 (0:당일, 1:2일전 ~ 9:1년)
 * - VOL_RANG: 거래량조건 (0:전체, 1:1백주이상, 2:1천주이상, 3:1만주이상, 4:10만주이상, 5:100만주이상, 6:1000만주이상)
 */
export interface KISOverseasVolumeRankingResponse {
  rt_cd: string;     // 성공 실패 여부 (0: 성공)
  msg_cd: string;    // 응답코드
  msg1: string;      // 응답메시지
  output: KISOverseasVolumeRankingItem[];
}

/**
 * 해외주식 거래량순위 개별 종목 데이터
 */
export interface KISOverseasVolumeRankingItem {
  symb: string;       // 종목코드
  name: string;       // 종목명
  last: string;       // 현재가
  sign: string;       // 대비기호
  diff: string;       // 대비
  rate: string;       // 등락율 (%)
  tvol: string;       // 거래량
  tamt: string;       // 거래대금
  avol: string;       // 전일거래량
  prat: string;       // 전일대비거래량비율
  [key: string]: string;
}

/**
 * 해외주식 시가총액순위 API 응답
 * GET /uapi/overseas-stock/v1/ranking/market-cap
 * tr_id: HHDFS76350100
 *
 * @description
 * 해외주식 시가총액 순위를 조회합니다.
 *
 * 파라미터:
 * - EXCD: 거래소코드 (NYS, NAS 등)
 * - VOL_RANG: 거래량조건 (0:전체 ~ 6:1000만주이상)
 */
export interface KISOverseasMarketCapRankingResponse {
  rt_cd: string;     // 성공 실패 여부 (0: 성공)
  msg_cd: string;    // 응답코드
  msg1: string;      // 응답메시지
  output: KISOverseasMarketCapRankingItem[];
}

/**
 * 해외주식 시가총액순위 개별 종목 데이터
 */
export interface KISOverseasMarketCapRankingItem {
  symb: string;       // 종목코드
  name: string;       // 종목명
  last: string;       // 현재가
  sign: string;       // 대비기호
  diff: string;       // 대비
  rate: string;       // 등락율 (%)
  tvol: string;       // 거래량
  mcap: string;       // 시가총액
  [key: string]: string;
}

/**
 * 해외주식 등락률순위 API 응답
 * GET /uapi/overseas-stock/v1/ranking/updown-rate
 * tr_id: HHDFS76290000
 *
 * @description
 * 해외주식 등락률 순위를 조회합니다.
 *
 * 파라미터:
 * - EXCD: 거래소코드 (NYS, NAS 등)
 * - NDAY: N일자값 (0:당일 ~ 9:1년)
 * - GUBN: 상승/하락 구분 (0:하락율순, 1:상승율순)
 * - VOL_RANG: 거래량조건 (0:전체 ~ 6:1000만주이상)
 */
export interface KISOverseasFluctuationRankingResponse {
  rt_cd: string;     // 성공 실패 여부 (0: 성공)
  msg_cd: string;    // 응답코드
  msg1: string;      // 응답메시지
  output: KISOverseasFluctuationRankingItem[];
}

/**
 * 해외주식 등락률순위 개별 종목 데이터
 */
export interface KISOverseasFluctuationRankingItem {
  symb: string;       // 종목코드
  name: string;       // 종목명
  last: string;       // 현재가
  sign: string;       // 대비기호
  diff: string;       // 대비
  rate: string;       // 등락율 (%)
  tvol: string;       // 거래량
  base: string;       // 전일종가
  [key: string]: string;
}

// ==================== 클라이언트용 해외주식 순위 데이터 타입 ====================

/**
 * 클라이언트에 반환할 해외주식 거래량순위 정보 (정제된 형태)
 */
export interface OverseasVolumeRankingData {
  rank: number;             // 순위
  symbol: string;           // 종목코드
  name: string;             // 종목명
  exchange: OverseasExchangeCode;  // 거래소코드
  currentPrice: number;     // 현재가
  change: number;           // 전일대비
  changePercent: number;    // 전일대비율 (%)
  changeSign: string;       // 등락부호 (up, down, flat)
  volume: number;           // 거래량
  tradingValue: number;     // 거래대금
  previousVolume: number;   // 전일거래량
  volumeChangeRate: number; // 전일대비거래량비율
}

/**
 * 클라이언트에 반환할 해외주식 시가총액순위 정보 (정제된 형태)
 */
export interface OverseasMarketCapRankingData {
  rank: number;             // 순위
  symbol: string;           // 종목코드
  name: string;             // 종목명
  exchange: OverseasExchangeCode;  // 거래소코드
  currentPrice: number;     // 현재가
  change: number;           // 전일대비
  changePercent: number;    // 전일대비율 (%)
  changeSign: string;       // 등락부호 (up, down, flat)
  volume: number;           // 거래량
  marketCap: number;        // 시가총액
}

/**
 * 클라이언트에 반환할 해외주식 등락률순위 정보 (정제된 형태)
 */
export interface OverseasFluctuationRankingData {
  rank: number;             // 순위
  symbol: string;           // 종목코드
  name: string;             // 종목명
  exchange: OverseasExchangeCode;  // 거래소코드
  currentPrice: number;     // 현재가
  change: number;           // 전일대비
  changePercent: number;    // 전일대비율 (%)
  changeSign: string;       // 등락부호 (up, down, flat)
  volume: number;           // 거래량
  previousClose: number;    // 전일종가
}
