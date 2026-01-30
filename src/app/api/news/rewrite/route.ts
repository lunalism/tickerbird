/**
 * 뉴스 AI 재작성 API
 *
 * POST /api/news/rewrite
 *
 * Claude 3.5 Haiku를 사용하여 뉴스를 투자자 관점으로 재작성합니다.
 *
 * ============================================================
 * 기능:
 * ============================================================
 * 1. 원본 뉴스 URL에서 콘텐츠 추출 (또는 본문 직접 전달)
 * 2. Claude AI로 투자자 관점 재작성
 * 3. Firestore에 24시간 캐싱
 * 4. 캐시된 콘텐츠 있으면 즉시 반환
 *
 * ============================================================
 * 프롬프트 전략:
 * ============================================================
 * - 원문의 팩트만 유지하고 완전히 새로운 문장으로 재작성
 * - 투자자 관점의 분석 포함
 * - 관련 종목 및 투자 포인트 추출
 * - 호재/악재/중립 판단
 */

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import {
  rewrittenNewsDoc,
  getDocument,
  setDocument,
} from '@/lib/firestore';
import { Timestamp } from 'firebase/firestore';
import {
  RewriteNewsRequest,
  RewriteNewsResponse,
  RewrittenNewsContent,
  FirestoreRewrittenNews,
} from '@/types/rewritten-news';

// ============================================
// Anthropic 클라이언트 초기화
// ============================================

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ============================================
// 상수 정의
// ============================================

/** 캐시 TTL: 24시간 (밀리초) */
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/** Claude 모델 */
const CLAUDE_MODEL = 'claude-3-5-sonnet-20241022';

// ============================================
// 프롬프트 생성
// ============================================

/**
 * Claude에게 전달할 프롬프트를 생성합니다.
 *
 * @param title - 뉴스 제목
 * @param content - 뉴스 본문
 * @returns 프롬프트 문자열
 */
function buildPrompt(title: string, content: string): string {
  return `다음 뉴스를 투자자 관점에서 완전히 새로운 문장으로 재작성해주세요.
원문의 문장을 그대로 사용하지 말고, 팩트만 유지하면서 새롭게 작성하세요.

[제목]
${title}

[원문]
${content}

응답은 반드시 아래 JSON 형식으로만 작성하세요. 다른 텍스트 없이 JSON만 응답하세요:
{
  "summary": "핵심 요약 2~3문장 (투자자에게 중요한 내용 중심)",
  "content": "재작성된 본문 (300~500자, 투자자 관점에서 중요한 내용 중심으로)",
  "investmentPoints": ["투자 포인트 1", "투자 포인트 2", "투자 포인트 3"],
  "relatedStocks": ["관련 종목명 1", "관련 종목명 2"],
  "sentiment": "positive" 또는 "negative" 또는 "neutral"
}

참고:
- sentiment는 이 뉴스가 관련 종목이나 시장에 미치는 영향을 기준으로 판단
- positive: 호재 (주가 상승에 긍정적)
- negative: 악재 (주가 하락에 부정적)
- neutral: 중립 (영향 미미하거나 판단 어려움)
- relatedStocks가 없으면 빈 배열로`;
}

// ============================================
// 웹페이지 콘텐츠 추출
// ============================================

/**
 * URL에서 뉴스 본문을 추출합니다.
 *
 * 간단한 HTML 파싱으로 본문 텍스트를 추출합니다.
 * 네이버 뉴스 등 주요 뉴스 사이트에 최적화되어 있습니다.
 *
 * @param url - 뉴스 원문 URL
 * @returns 추출된 본문 텍스트
 */
async function fetchNewsContent(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AlphaBoard/1.0)',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();

    // HTML 태그 제거하여 텍스트만 추출
    // 메타 태그에서 description 추출 시도
    const metaMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
    const ogMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);

    // article 태그 또는 본문 영역 추출
    const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
    const contentMatch = html.match(/<div[^>]*class=["'][^"']*article[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);

    let text = '';

    if (articleMatch) {
      text = articleMatch[1];
    } else if (contentMatch) {
      text = contentMatch[1];
    } else {
      // 폴백: body 전체에서 추출
      const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      text = bodyMatch ? bodyMatch[1] : html;
    }

    // HTML 태그 제거
    text = text
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim();

    // 텍스트가 너무 짧으면 메타 description 사용
    if (text.length < 100) {
      text = ogMatch?.[1] || metaMatch?.[1] || text;
    }

    // 최대 2000자로 제한 (Claude 컨텍스트 절약)
    return text.slice(0, 2000);
  } catch (error) {
    console.error('[News Rewrite API] 콘텐츠 추출 실패:', error);
    return '';
  }
}

// ============================================
// Claude API 호출
// ============================================

/**
 * Claude API를 호출하여 뉴스를 재작성합니다.
 *
 * @param title - 뉴스 제목
 * @param content - 뉴스 본문
 * @returns 재작성된 콘텐츠
 */
async function rewriteWithClaude(
  title: string,
  content: string
): Promise<RewrittenNewsContent> {
  const prompt = buildPrompt(title, content);

  const message = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  // 응답 텍스트 추출
  const responseText = message.content[0].type === 'text'
    ? message.content[0].text
    : '';

  // JSON 파싱
  try {
    // JSON 블록 추출 (```json ... ``` 또는 순수 JSON)
    const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) ||
                      responseText.match(/(\{[\s\S]*\})/);

    if (!jsonMatch) {
      throw new Error('JSON 응답을 찾을 수 없음');
    }

    const parsed = JSON.parse(jsonMatch[1]) as RewrittenNewsContent;

    // 필수 필드 검증
    if (!parsed.summary || !parsed.content || !parsed.sentiment) {
      throw new Error('필수 필드 누락');
    }

    return {
      summary: parsed.summary,
      content: parsed.content,
      investmentPoints: parsed.investmentPoints || [],
      relatedStocks: parsed.relatedStocks || [],
      sentiment: parsed.sentiment,
    };
  } catch (parseError) {
    console.error('[News Rewrite API] JSON 파싱 실패:', parseError, responseText);

    // 파싱 실패 시 기본값 반환
    return {
      summary: `${title}에 대한 뉴스입니다.`,
      content: content.slice(0, 500),
      investmentPoints: [],
      relatedStocks: [],
      sentiment: 'neutral',
    };
  }
}

// ============================================
// POST: 뉴스 재작성
// ============================================

/**
 * POST /api/news/rewrite
 *
 * 뉴스를 AI로 재작성합니다.
 *
 * Body:
 * - newsId: 뉴스 고유 ID (캐시 키)
 * - url: 원본 뉴스 URL
 * - title: 뉴스 제목
 * - source: 언론사
 * - content: 본문 (선택 - 없으면 URL에서 추출)
 */
export async function POST(request: NextRequest) {
  try {
    const body: RewriteNewsRequest = await request.json();
    const { newsId, url, title, source, content } = body;

    // 필수 파라미터 검증
    if (!newsId || !url || !title) {
      return NextResponse.json<RewriteNewsResponse>(
        { success: false, error: 'newsId, url, title은 필수입니다.' },
        { status: 400 }
      );
    }

    // ========================================
    // 1. 캐시 확인
    // ========================================
    const cached = await getDocument<FirestoreRewrittenNews>(rewrittenNewsDoc(newsId));

    if (cached) {
      // 만료 시간 확인
      const now = Timestamp.now();
      if (cached.expiresAt && cached.expiresAt.toMillis() > now.toMillis()) {
        // 캐시 유효 - 즉시 반환
        console.log(`[News Rewrite API] 캐시 히트: ${newsId}`);
        return NextResponse.json<RewriteNewsResponse>({
          success: true,
          data: {
            summary: cached.summary,
            content: cached.content,
            investmentPoints: cached.investmentPoints,
            relatedStocks: cached.relatedStocks,
            sentiment: cached.sentiment,
            originalUrl: cached.originalUrl,
            originalTitle: cached.originalTitle,
            originalSource: cached.originalSource,
            fromCache: true,
          },
        });
      }
    }

    // ========================================
    // 2. 원문 콘텐츠 준비
    // ========================================
    let newsContent = content;

    if (!newsContent) {
      // URL에서 콘텐츠 추출
      newsContent = await fetchNewsContent(url);

      if (!newsContent) {
        // 콘텐츠 추출 실패 시 제목만 사용
        newsContent = title;
      }
    }

    // ========================================
    // 3. Claude AI 재작성
    // ========================================
    console.log(`[News Rewrite API] AI 재작성 시작: ${newsId}`);
    const rewritten = await rewriteWithClaude(title, newsContent);

    // ========================================
    // 4. Firestore에 캐싱
    // ========================================
    const now = Timestamp.now();
    const expiresAt = Timestamp.fromMillis(now.toMillis() + CACHE_TTL_MS);

    const cacheData: Omit<FirestoreRewrittenNews, 'createdAt'> = {
      originalNewsId: newsId,
      originalUrl: url,
      originalTitle: title,
      originalSource: source,
      ...rewritten,
      expiresAt,
    };

    await setDocument(rewrittenNewsDoc(newsId), {
      ...cacheData,
      createdAt: now,
    }, false);

    console.log(`[News Rewrite API] 캐시 저장 완료: ${newsId}`);

    // ========================================
    // 5. 응답 반환
    // ========================================
    return NextResponse.json<RewriteNewsResponse>({
      success: true,
      data: {
        ...rewritten,
        originalUrl: url,
        originalTitle: title,
        originalSource: source,
        fromCache: false,
      },
    });
  } catch (error) {
    console.error('[News Rewrite API] 에러:', error);

    return NextResponse.json<RewriteNewsResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : '서버 오류가 발생했습니다.',
      },
      { status: 500 }
    );
  }
}
