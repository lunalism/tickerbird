/**
 * 회사 정보 API Route (Wikipedia 기반)
 *
 * @route GET /api/company-info
 * @query symbol - 종목 심볼 (필수: AAPL, TSLA 등)
 * @query name - 회사명 (선택: 한글명 우선)
 *
 * @description
 * Wikipedia API를 사용하여 회사 소개를 가져옵니다.
 * 한국어 위키를 먼저 시도하고, 없으면 영어 위키에서 가져옵니다.
 * Firestore에 30일간 캐싱하여 API 호출을 최소화합니다.
 *
 * 캐싱 전략:
 * 1. Firestore에서 캐시 확인
 * 2. 캐시 유효하면 즉시 반환
 * 3. 캐시 없거나 만료되면 Wikipedia API 호출
 * 4. 가져온 정보를 Firestore에 저장 (30일 TTL)
 */

import { NextRequest, NextResponse } from 'next/server';
import { companyInfoDoc } from '@/lib/firestore';
import { getDoc, setDoc, Timestamp } from 'firebase/firestore';

// ==================== 타입 정의 ====================

/**
 * Wikipedia API 응답 타입
 */
interface WikipediaResponse {
  /** 문서 제목 */
  title: string;
  /** 문서 요약 (extract) */
  extract: string;
  /** 썸네일 이미지 */
  thumbnail?: {
    source: string;
    width: number;
    height: number;
  };
  /** 원본 이미지 */
  originalimage?: {
    source: string;
    width: number;
    height: number;
  };
  /** 데스크톱 페이지 URL */
  content_urls?: {
    desktop: {
      page: string;
    };
  };
}

/**
 * Firestore에 저장되는 회사 정보 문서
 */
interface CompanyInfoDocument {
  /** 종목 심볼 */
  symbol: string;
  /** 회사명 */
  name: string;
  /** 회사 소개 (Wikipedia extract) */
  description: string;
  /** 썸네일 이미지 URL */
  thumbnail: string | null;
  /** Wikipedia 페이지 URL */
  wikiUrl: string | null;
  /** 생성 시각 */
  createdAt: Timestamp;
  /** 만료 시각 (30일 후) */
  expiresAt: Timestamp;
}

/**
 * API 응답 타입
 */
interface CompanyInfoResponse {
  symbol: string;
  name: string;
  description: string;
  thumbnail: string | null;
  wikiUrl: string | null;
  cached: boolean;
}

/**
 * 에러 응답 타입
 */
interface ErrorResponse {
  error: string;
  message: string;
}

// ==================== 상수 ====================

/** 캐시 유효 기간 (30일, 밀리초) */
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** Wikipedia API 타임아웃 (10초) */
const WIKI_TIMEOUT_MS = 10000;

/**
 * 종목별 Wikipedia 검색어 매핑
 *
 * 일부 회사는 Wikipedia 제목이 주식 심볼이나 회사명과 다를 수 있음
 * 예: 테슬라 → "테슬라 (기업)", Apple → "애플 (기업)"
 */
const WIKI_SEARCH_TERMS: Record<string, { ko: string; en: string }> = {
  // 미국 대형주
  AAPL: { ko: '애플 (기업)', en: 'Apple Inc.' },
  MSFT: { ko: '마이크로소프트', en: 'Microsoft' },
  GOOGL: { ko: '구글', en: 'Google' },
  GOOG: { ko: '구글', en: 'Google' },
  AMZN: { ko: '아마존 (기업)', en: 'Amazon (company)' },
  META: { ko: '메타 (기업)', en: 'Meta Platforms' },
  TSLA: { ko: '테슬라 (기업)', en: 'Tesla, Inc.' },
  NVDA: { ko: '엔비디아', en: 'Nvidia' },
  JPM: { ko: 'JP모건 체이스', en: 'JPMorgan Chase' },
  V: { ko: '비자 (기업)', en: 'Visa Inc.' },
  JNJ: { ko: '존슨앤드존슨', en: 'Johnson & Johnson' },
  WMT: { ko: '월마트', en: 'Walmart' },
  PG: { ko: 'P&G', en: 'Procter & Gamble' },
  MA: { ko: '마스터카드', en: 'Mastercard' },
  UNH: { ko: '유나이티드헬스 그룹', en: 'UnitedHealth Group' },
  HD: { ko: '홈 디포', en: 'The Home Depot' },
  DIS: { ko: '월트 디즈니 컴퍼니', en: 'The Walt Disney Company' },
  BAC: { ko: '뱅크 오브 아메리카', en: 'Bank of America' },
  XOM: { ko: '엑슨모빌', en: 'ExxonMobil' },
  KO: { ko: '코카콜라 컴퍼니', en: 'The Coca-Cola Company' },
  PEP: { ko: '펩시코', en: 'PepsiCo' },
  COST: { ko: '코스트코', en: 'Costco' },
  NFLX: { ko: '넷플릭스', en: 'Netflix' },
  INTC: { ko: '인텔', en: 'Intel' },
  AMD: { ko: 'AMD', en: 'AMD' },
  CRM: { ko: '세일즈포스', en: 'Salesforce' },
  ORCL: { ko: '오라클 (기업)', en: 'Oracle Corporation' },
  CSCO: { ko: '시스코 시스템즈', en: 'Cisco' },
  ADBE: { ko: '어도비', en: 'Adobe Inc.' },
  IBM: { ko: 'IBM', en: 'IBM' },
  QCOM: { ko: '퀄컴', en: 'Qualcomm' },
  TXN: { ko: '텍사스 인스트루먼츠', en: 'Texas Instruments' },
  NOW: { ko: '서비스나우', en: 'ServiceNow' },
  UBER: { ko: '우버', en: 'Uber' },
  ABNB: { ko: '에어비앤비', en: 'Airbnb' },
  SQ: { ko: '블록 (기업)', en: 'Block, Inc.' },
  PYPL: { ko: '페이팔', en: 'PayPal' },
  SHOP: { ko: '쇼피파이', en: 'Shopify' },
  SPOT: { ko: '스포티파이', en: 'Spotify' },
  ZM: { ko: '줌 비디오 커뮤니케이션즈', en: 'Zoom Video Communications' },
  SNAP: { ko: '스냅 (기업)', en: 'Snap Inc.' },
  PINS: { ko: '핀터레스트', en: 'Pinterest' },
  RBLX: { ko: '로블록스', en: 'Roblox' },
  COIN: { ko: '코인베이스', en: 'Coinbase' },
  PLTR: { ko: '팰런티어 테크놀로지스', en: 'Palantir Technologies' },
  SNOW: { ko: '스노우플레이크 (기업)', en: 'Snowflake Inc.' },
  NET: { ko: '클라우드플레어', en: 'Cloudflare' },
  DDOG: { ko: '데이터독', en: 'Datadog' },
  MDB: { ko: '몽고DB', en: 'MongoDB' },
  CRWD: { ko: '크라우드스트라이크', en: 'CrowdStrike' },
  OKTA: { ko: '옥타', en: 'Okta' },
  ZS: { ko: '지스케일러', en: 'Zscaler' },
  PANW: { ko: '팰로앨토 네트웍스', en: 'Palo Alto Networks' },
  // 자동차
  F: { ko: '포드 자동차', en: 'Ford Motor Company' },
  GM: { ko: '제너럴 모터스', en: 'General Motors' },
  RIVN: { ko: '리비안', en: 'Rivian' },
  LCID: { ko: '루시드 모터스', en: 'Lucid Motors' },
  // 항공/방산
  BA: { ko: '보잉', en: 'Boeing' },
  LMT: { ko: '록히드 마틴', en: 'Lockheed Martin' },
  RTX: { ko: '레이시온', en: 'RTX Corporation' },
  // 소매/소비재
  NKE: { ko: '나이키', en: 'Nike, Inc.' },
  SBUX: { ko: '스타벅스', en: 'Starbucks' },
  MCD: { ko: '맥도날드', en: "McDonald's" },
  TGT: { ko: '타겟 (기업)', en: 'Target Corporation' },
  LOW: { ko: '로우스', en: "Lowe's" },
  // 제약/바이오
  PFE: { ko: '화이자', en: 'Pfizer' },
  MRNA: { ko: '모더나', en: 'Moderna' },
  ABBV: { ko: '애브비', en: 'AbbVie' },
  LLY: { ko: '일라이 릴리', en: 'Eli Lilly and Company' },
  MRK: { ko: '머크 (미국)', en: 'Merck & Co.' },
  // 금융
  GS: { ko: '골드만삭스', en: 'Goldman Sachs' },
  MS: { ko: '모건 스탠리', en: 'Morgan Stanley' },
  C: { ko: '시티그룹', en: 'Citigroup' },
  WFC: { ko: '웰스파고', en: 'Wells Fargo' },
  AXP: { ko: '아메리칸 익스프레스', en: 'American Express' },
  BLK: { ko: '블랙록', en: 'BlackRock' },
  // 에너지
  CVX: { ko: '셰브런', en: 'Chevron Corporation' },
  COP: { ko: '코노코필립스', en: 'ConocoPhillips' },
  // 통신
  T: { ko: 'AT&T', en: 'AT&T' },
  VZ: { ko: '버라이즌', en: 'Verizon' },
  TMUS: { ko: 'T-모바일 US', en: 'T-Mobile US' },
  // 반도체
  AVGO: { ko: '브로드컴', en: 'Broadcom' },
  MU: { ko: '마이크론 테크놀로지', en: 'Micron Technology' },
  LRCX: { ko: '램리서치', en: 'Lam Research' },
  KLAC: { ko: 'KLA', en: 'KLA Corporation' },
  AMAT: { ko: '어플라이드 머티어리얼즈', en: 'Applied Materials' },
  ASML: { ko: 'ASML', en: 'ASML' },
  TSM: { ko: 'TSMC', en: 'TSMC' },
};

// ==================== Wikipedia API ====================

/**
 * Wikipedia API에서 회사 정보 가져오기
 *
 * 1. 한국어 Wikipedia 먼저 시도
 * 2. 한국어 없으면 영어 Wikipedia 시도
 * 3. 둘 다 없으면 null 반환
 *
 * @param symbol 종목 심볼
 * @param name 회사명 (한글)
 * @returns 회사 정보 또는 null
 */
async function fetchWikipediaInfo(
  symbol: string,
  name: string
): Promise<{ description: string; thumbnail: string | null; wikiUrl: string | null } | null> {
  // 검색어 결정 (매핑 테이블 우선, 없으면 전달받은 이름 사용)
  const searchTerms = WIKI_SEARCH_TERMS[symbol] || { ko: name, en: symbol };

  console.log(`[Company Info] Wikipedia 검색: ${symbol} (ko: ${searchTerms.ko}, en: ${searchTerms.en})`);

  // AbortController로 타임아웃 설정
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), WIKI_TIMEOUT_MS);

  try {
    // 1. 한국어 Wikipedia 시도
    const koUrl = `https://ko.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(searchTerms.ko)}`;
    console.log(`[Company Info] 한국어 Wikipedia 요청: ${koUrl}`);

    const koResponse = await fetch(koUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'AlphaBoard/1.0 (https://alphaboard.vercel.app; contact@alphaboard.com)',
      },
      signal: controller.signal,
    });

    if (koResponse.ok) {
      const koData: WikipediaResponse = await koResponse.json();

      // extract가 있고 충분한 길이인 경우
      if (koData.extract && koData.extract.length > 50) {
        console.log(`[Company Info] 한국어 Wikipedia 성공: ${koData.title}`);
        clearTimeout(timeoutId);

        return {
          description: truncateDescription(koData.extract),
          thumbnail: koData.thumbnail?.source || null,
          wikiUrl: koData.content_urls?.desktop?.page || null,
        };
      }
    }

    // 2. 영어 Wikipedia 시도
    const enUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(searchTerms.en)}`;
    console.log(`[Company Info] 영어 Wikipedia 요청: ${enUrl}`);

    const enResponse = await fetch(enUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'AlphaBoard/1.0 (https://alphaboard.vercel.app; contact@alphaboard.com)',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (enResponse.ok) {
      const enData: WikipediaResponse = await enResponse.json();

      if (enData.extract && enData.extract.length > 50) {
        console.log(`[Company Info] 영어 Wikipedia 성공: ${enData.title}`);

        return {
          description: truncateDescription(enData.extract),
          thumbnail: enData.thumbnail?.source || null,
          wikiUrl: enData.content_urls?.desktop?.page || null,
        };
      }
    }

    console.log(`[Company Info] Wikipedia 정보 없음: ${symbol}`);
    return null;

  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      console.error(`[Company Info] Wikipedia 타임아웃: ${symbol}`);
    } else {
      console.error(`[Company Info] Wikipedia 에러:`, error);
    }

    return null;
  }
}

/**
 * 설명 텍스트를 적절한 길이로 자르기
 *
 * - 최대 3문장 또는 300자
 * - 문장 단위로 자르기
 *
 * @param text 원본 텍스트
 * @returns 잘린 텍스트
 */
function truncateDescription(text: string): string {
  // 문장 분리 (마침표, 물음표, 느낌표 기준)
  const sentences = text.split(/(?<=[.!?。])\s+/);

  // 최대 3문장 선택
  const selected = sentences.slice(0, 3);
  let result = selected.join(' ');

  // 300자 초과 시 자르기
  if (result.length > 300) {
    result = result.substring(0, 297) + '...';
  }

  return result;
}

// ==================== Firestore 캐시 ====================

/**
 * Firestore에서 캐시된 회사 정보 조회
 *
 * @param symbol 종목 심볼
 * @returns 캐시된 정보 (유효한 경우) 또는 null
 */
async function getCachedCompanyInfo(symbol: string): Promise<CompanyInfoDocument | null> {
  try {
    const docRef = companyInfoDoc(symbol);
    const doc = await getDoc(docRef);

    if (!doc.exists()) {
      console.log(`[Company Info] 캐시 없음: ${symbol}`);
      return null;
    }

    const data = doc.data() as CompanyInfoDocument;

    // 만료 시각 확인
    const now = new Date();
    const expiresAt = data.expiresAt.toDate();

    if (now > expiresAt) {
      console.log(`[Company Info] 캐시 만료: ${symbol} (만료: ${expiresAt.toISOString()})`);
      return null;
    }

    console.log(`[Company Info] 캐시 히트: ${symbol}`);
    return data;
  } catch (error) {
    console.error(`[Company Info] 캐시 조회 실패:`, error);
    return null;
  }
}

/**
 * Firestore에 회사 정보 캐시 저장
 *
 * @param symbol 종목 심볼
 * @param name 회사명
 * @param description 회사 소개
 * @param thumbnail 썸네일 URL
 * @param wikiUrl Wikipedia 페이지 URL
 */
async function saveCompanyInfoCache(
  symbol: string,
  name: string,
  description: string,
  thumbnail: string | null,
  wikiUrl: string | null
): Promise<void> {
  try {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + CACHE_TTL_MS);

    const docRef = companyInfoDoc(symbol);
    await setDoc(docRef, {
      symbol,
      name,
      description,
      thumbnail,
      wikiUrl,
      createdAt: Timestamp.fromDate(now),
      expiresAt: Timestamp.fromDate(expiresAt),
    });

    console.log(`[Company Info] 캐시 저장: ${symbol} (만료: ${expiresAt.toISOString()})`);
  } catch (error) {
    // 캐시 저장 실패해도 응답은 반환
    console.error(`[Company Info] 캐시 저장 실패:`, error);
  }
}

// ==================== API Handler ====================

/**
 * GET /api/company-info
 *
 * @returns 회사 정보 또는 에러
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse<CompanyInfoResponse | ErrorResponse>> {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get('symbol')?.toUpperCase();
  const name = searchParams.get('name') || symbol || '';

  // 필수 파라미터 검증
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
    // 1. 캐시 확인
    const cached = await getCachedCompanyInfo(symbol);

    if (cached) {
      // 캐시 히트 - 즉시 반환
      return NextResponse.json({
        symbol: cached.symbol,
        name: cached.name,
        description: cached.description,
        thumbnail: cached.thumbnail,
        wikiUrl: cached.wikiUrl,
        cached: true,
      });
    }

    // 2. 캐시 미스 - Wikipedia API 호출
    const wikiInfo = await fetchWikipediaInfo(symbol, name);

    if (!wikiInfo) {
      // Wikipedia에서 정보를 찾을 수 없음
      return NextResponse.json(
        {
          error: 'NOT_FOUND',
          message: `${name}(${symbol})에 대한 정보를 찾을 수 없습니다.`,
        },
        { status: 404 }
      );
    }

    // 3. 캐시 저장 (백그라운드)
    saveCompanyInfoCache(symbol, name, wikiInfo.description, wikiInfo.thumbnail, wikiInfo.wikiUrl);

    // 4. 응답 반환
    return NextResponse.json({
      symbol,
      name,
      description: wikiInfo.description,
      thumbnail: wikiInfo.thumbnail,
      wikiUrl: wikiInfo.wikiUrl,
      cached: false,
    });

  } catch (error) {
    console.error(`[API /api/company-info] 에러:`, error);

    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';

    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message: errorMessage,
      },
      { status: 500 }
    );
  }
}
