/**
 * 네이버 금융 뉴스 크롤링 API
 *
 * 네이버 금융에서 뉴스를 크롤링하여 반환합니다.
 * 서버 부하 방지를 위해 5분 캐싱을 적용합니다.
 *
 * @route GET /api/news
 * @query category - 뉴스 카테고리 ('headlines' | 'market' | 'stock' | 'world' | 'bond')
 * @query limit - 최대 뉴스 개수 (기본값: 20, 최대: 50)
 * @query stockCode - 종목 코드 (category가 'stock'인 경우)
 *
 * @returns 뉴스 목록
 *
 * 사용 예시:
 * - GET /api/news (실시간 속보)
 * - GET /api/news?category=market (시장 뉴스)
 * - GET /api/news?category=stock&stockCode=005930 (삼성전자 뉴스)
 */

import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import crypto from 'crypto';
import iconv from 'iconv-lite';
import type {
  CrawledNewsItem,
  CrawledNewsCategory,
  CrawledNewsResponse,
  CrawledNewsErrorResponse,
} from '@/types/crawled-news';

// ==================== 상수 정의 ====================

/** 캐시 만료 시간 (5분) */
const CACHE_TTL = 5 * 60 * 1000;

/** HTTP 요청 타임아웃 (10초) */
const REQUEST_TIMEOUT = 10000;

/** 기본 User-Agent (서버 차단 방지) */
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/**
 * 네이버 금융 뉴스 URL 매핑
 *
 * 카테고리별 네이버 금융 뉴스 페이지 URL입니다.
 */
const NEWS_URLS: Record<CrawledNewsCategory, string> = {
  // 실시간 속보 - 메인 뉴스
  headlines: 'https://finance.naver.com/news/news_list.naver?mode=LSS2D&section_id=101&section_id2=258',
  // 시장 뉴스 - 증시 일반
  market: 'https://finance.naver.com/news/news_list.naver?mode=LSS2D&section_id=101&section_id2=258',
  // 종목별 뉴스 - 동적 URL (stockCode 필요)
  stock: 'https://finance.naver.com/item/news.naver?code=',
  // 해외 증시
  world: 'https://finance.naver.com/news/news_list.naver?mode=LSS2D&section_id=101&section_id2=262',
  // 채권/외환
  bond: 'https://finance.naver.com/news/news_list.naver?mode=LSS2D&section_id=101&section_id2=259',
};

// ==================== 캐시 관리 ====================

/**
 * 뉴스 캐시 저장소
 *
 * 카테고리별로 뉴스 데이터를 캐시합니다.
 * 5분 후 자동 만료됩니다.
 */
interface NewsCache {
  /** 캐시된 뉴스 목록 */
  news: CrawledNewsItem[];
  /** 캐시 생성 시간 */
  createdAt: number;
  /** 캐시 만료 시간 */
  expiresAt: number;
}

const newsCache = new Map<string, NewsCache>();

/**
 * 캐시 키 생성
 *
 * @param category 뉴스 카테고리
 * @param stockCode 종목 코드 (옵션)
 * @returns 캐시 키 문자열
 */
function getCacheKey(category: CrawledNewsCategory, stockCode?: string): string {
  return stockCode ? `${category}:${stockCode}` : category;
}

/**
 * 캐시에서 뉴스 조회
 *
 * @param key 캐시 키
 * @returns 캐시된 뉴스 데이터 또는 null
 */
function getFromCache(key: string): NewsCache | null {
  const cached = newsCache.get(key);
  if (!cached) return null;

  // 만료 확인
  if (Date.now() > cached.expiresAt) {
    newsCache.delete(key);
    return null;
  }

  return cached;
}

/**
 * 캐시에 뉴스 저장
 *
 * @param key 캐시 키
 * @param news 뉴스 목록
 */
function setToCache(key: string, news: CrawledNewsItem[]): void {
  const now = Date.now();
  newsCache.set(key, {
    news,
    createdAt: now,
    expiresAt: now + CACHE_TTL,
  });
}

// ==================== 유틸리티 함수 ====================

/**
 * URL에서 고유 ID 생성
 *
 * 뉴스 URL을 해시하여 고유 ID를 생성합니다.
 *
 * @param url 뉴스 URL
 * @returns 8자리 해시 ID
 */
function generateNewsId(url: string): string {
  return crypto.createHash('md5').update(url).digest('hex').substring(0, 8);
}

/**
 * 상대 시간을 파싱하여 표시용 문자열로 변환
 *
 * 네이버 금융의 시간 표시를 파싱합니다.
 * - "1시간 전", "30분 전" 형태
 * - "2024.01.15 10:30" 형태
 *
 * @param timeText 원본 시간 텍스트
 * @returns 정규화된 시간 문자열
 */
function parseTimeText(timeText: string): string {
  const trimmed = timeText.trim();

  // 이미 상대 시간 형태면 그대로 반환
  if (trimmed.includes('분 전') || trimmed.includes('시간 전')) {
    return trimmed;
  }

  // 날짜 형태면 "MM.DD HH:mm" 형식으로 변환
  const dateMatch = trimmed.match(/(\d{4})\.(\d{2})\.(\d{2})\s*(\d{2}):(\d{2})/);
  if (dateMatch) {
    const [, , month, day, hour, minute] = dateMatch;
    return `${month}.${day} ${hour}:${minute}`;
  }

  return trimmed;
}

// ==================== 크롤링 함수 ====================

/**
 * 네이버 금융 뉴스 크롤링
 *
 * 지정된 카테고리의 뉴스를 크롤링합니다.
 * User-Agent를 설정하여 차단을 방지합니다.
 *
 * @param category 뉴스 카테고리
 * @param stockCode 종목 코드 (stock 카테고리인 경우)
 * @param limit 최대 뉴스 개수
 * @returns 크롤링된 뉴스 목록
 */
async function crawlNaverFinanceNews(
  category: CrawledNewsCategory,
  stockCode?: string,
  limit: number = 20
): Promise<CrawledNewsItem[]> {
  // URL 결정
  let url = NEWS_URLS[category];
  if (category === 'stock' && stockCode) {
    url = `${url}${stockCode}`;
  }

  console.log(`[News Crawler] ${category} 뉴스 크롤링 시작: ${url}`);

  try {
    // HTTP 요청 (타임아웃 적용)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP 에러: ${response.status}`);
    }

    // 네이버 금융은 EUC-KR 인코딩 사용
    const buffer = await response.arrayBuffer();
    const html = iconv.decode(Buffer.from(buffer), 'euc-kr');
    const $ = cheerio.load(html);

    const newsItems: CrawledNewsItem[] = [];

    // 종목 뉴스 크롤링 (다른 HTML 구조)
    if (category === 'stock' && stockCode) {
      // 종목 뉴스 테이블에서 추출
      $('table.type5 tbody tr').each((_, row) => {
        if (newsItems.length >= limit) return false;

        const $row = $(row);
        const $titleLink = $row.find('td.title a');
        const title = $titleLink.text().trim();
        const href = $titleLink.attr('href');
        const source = $row.find('td.info').text().trim();
        const time = $row.find('td.date').text().trim();

        if (title && href) {
          // 네이버 뉴스 URL로 변환
          const fullUrl = href.startsWith('http') ? href : `https://finance.naver.com${href}`;

          newsItems.push({
            id: generateNewsId(fullUrl),
            title,
            url: fullUrl,
            source: source || '네이버금융',
            thumbnail: null,
            publishedAt: parseTimeText(time),
            description: null,
            category,
            stockCode,
          });
        }
      });
    } else {
      // 일반 뉴스 목록 크롤링
      // 네이버 금융 뉴스 페이지 구조:
      // dd.articleSubject > a (제목/링크)
      // dd.articleSummary (요약, 언론사, 시간) - articleSubject의 다음 형제

      // 모든 articleSubject 요소를 직접 선택
      $('dd.articleSubject, dt.articleSubject').each((_, subject) => {
        if (newsItems.length >= limit) return false;

        const $subject = $(subject);
        const $link = $subject.find('a');
        const title = $link.attr('title')?.trim() || $link.text().trim();
        const href = $link.attr('href');

        if (!title || !href) return;

        // 다음 형제 요소에서 articleSummary 찾기
        let $summary = $subject.next('dd.articleSummary');

        // 언론사 정보 (span.press)
        const source = $summary.find('span.press').text().trim() || '네이버금융';

        // 시간 정보 (span.wdate)
        const time = $summary.find('span.wdate').text().trim();

        // 요약 텍스트 (press와 wdate span을 제외한 첫 번째 텍스트 노드)
        let description: string | null = null;
        $summary.contents().each((_, node) => {
          if (node.type === 'text') {
            const text = $(node).text().trim();
            if (text.length > 10) {
              description = text.substring(0, 150) + '...';
              return false; // break
            }
          }
        });

        // 썸네일 (같은 dl 내의 img 찾기)
        const $parent = $subject.closest('dl');
        const $img = $parent.find('img').first();
        const thumbnail = $img.attr('src') || null;

        const fullUrl = href.startsWith('http') ? href : `https://finance.naver.com${href}`;

        newsItems.push({
          id: generateNewsId(fullUrl),
          title,
          url: fullUrl,
          source,
          thumbnail,
          publishedAt: parseTimeText(time),
          description,
          category,
        });
      });

      // 뉴스가 없으면 다른 선택자 시도 (newsList 클래스)
      if (newsItems.length === 0) {
        $('.newsList li, .realtimeNewsList li').each((_, el) => {
          if (newsItems.length >= limit) return false;

          const $el = $(el);
          const $link = $el.find('a').first();
          const title = $link.attr('title')?.trim() || $link.text().trim();
          const href = $link.attr('href');

          if (!title || !href) return;

          const fullUrl = href.startsWith('http') ? href : `https://finance.naver.com${href}`;

          newsItems.push({
            id: generateNewsId(fullUrl),
            title,
            url: fullUrl,
            source: '네이버금융',
            thumbnail: null,
            publishedAt: '',
            description: null,
            category,
          });
        });
      }
    }

    console.log(`[News Crawler] ${category} 뉴스 ${newsItems.length}개 크롤링 완료`);
    return newsItems;

  } catch (error) {
    console.error(`[News Crawler] 크롤링 실패:`, error);
    throw error;
  }
}

// ==================== API 핸들러 ====================

/**
 * GET /api/news
 *
 * 네이버 금융 뉴스를 크롤링하여 반환합니다.
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse<CrawledNewsResponse | CrawledNewsErrorResponse>> {
  const searchParams = request.nextUrl.searchParams;

  // 쿼리 파라미터 파싱
  const categoryParam = searchParams.get('category') || 'headlines';
  const limitParam = searchParams.get('limit');
  const stockCode = searchParams.get('stockCode') || undefined;

  // 카테고리 유효성 검사
  const validCategories: CrawledNewsCategory[] = ['headlines', 'market', 'stock', 'world', 'bond'];
  if (!validCategories.includes(categoryParam as CrawledNewsCategory)) {
    return NextResponse.json(
      {
        success: false,
        error: 'INVALID_CATEGORY',
        message: `유효하지 않은 카테고리입니다. 가능한 값: ${validCategories.join(', ')}`,
      },
      { status: 400 }
    );
  }

  const category = categoryParam as CrawledNewsCategory;

  // 종목 뉴스인데 종목 코드가 없는 경우
  if (category === 'stock' && !stockCode) {
    return NextResponse.json(
      {
        success: false,
        error: 'MISSING_STOCK_CODE',
        message: 'category가 stock인 경우 stockCode 파라미터가 필요합니다.',
      },
      { status: 400 }
    );
  }

  // limit 파싱 (기본값: 20, 최대: 50)
  let limit = 20;
  if (limitParam) {
    const parsed = parseInt(limitParam, 10);
    if (!isNaN(parsed) && parsed > 0) {
      limit = Math.min(parsed, 50);
    }
  }

  try {
    // 캐시 확인
    const cacheKey = getCacheKey(category, stockCode);
    const cached = getFromCache(cacheKey);

    if (cached) {
      console.log(`[News API] 캐시 적중: ${cacheKey}`);
      return NextResponse.json({
        success: true,
        news: cached.news.slice(0, limit),
        totalCount: cached.news.length,
        category,
        cache: {
          hit: true,
          expiresAt: new Date(cached.expiresAt).toISOString(),
        },
        timestamp: new Date().toISOString(),
      });
    }

    // 크롤링 실행
    const news = await crawlNaverFinanceNews(category, stockCode, limit);

    // 캐시 저장
    setToCache(cacheKey, news);

    return NextResponse.json({
      success: true,
      news: news.slice(0, limit),
      totalCount: news.length,
      category,
      cache: {
        hit: false,
        expiresAt: new Date(Date.now() + CACHE_TTL).toISOString(),
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[News API] 에러:', error);

    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';

    // 차단된 경우
    if (errorMessage.includes('403') || errorMessage.includes('blocked')) {
      return NextResponse.json(
        {
          success: false,
          error: 'ACCESS_DENIED',
          message: '뉴스 서버 접근이 차단되었습니다. 잠시 후 다시 시도해주세요.',
        },
        { status: 503 }
      );
    }

    // 타임아웃
    if (errorMessage.includes('abort') || errorMessage.includes('timeout')) {
      return NextResponse.json(
        {
          success: false,
          error: 'TIMEOUT',
          message: '뉴스 서버 응답 시간이 초과되었습니다.',
        },
        { status: 504 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'CRAWL_ERROR',
        message: errorMessage,
      },
      { status: 500 }
    );
  }
}
