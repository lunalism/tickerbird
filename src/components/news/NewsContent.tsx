'use client';

/**
 * NewsContent - AI 재작성 뉴스 콘텐츠 공통 컴포넌트
 *
 * 모달과 페이지에서 공통으로 사용하는 뉴스 콘텐츠 표시 컴포넌트입니다.
 *
 * ============================================================
 * 기능:
 * ============================================================
 * - AI 요약 및 재작성 본문 표시
 * - 투자 포인트 목록
 * - 관련 종목 태그
 * - 호재/악재/중립 배지
 * - 원문 보기 링크
 * - 로딩 상태 스켈레톤
 */

import { useFontSizeStore, FONT_SIZE_MAP } from '@/stores';
import { RewrittenNewsContent, SENTIMENT_CONFIG, NewsSentiment } from '@/types/rewritten-news';

// ============================================
// Props 타입 정의
// ============================================

interface NewsContentProps {
  /** 뉴스 제목 */
  title: string;
  /** 출처 */
  source: string;
  /** 발행 시간 */
  publishedAt: string;
  /** 원문 URL */
  originalUrl: string;
  /** AI 재작성 콘텐츠 (로딩 중이면 null) */
  rewrittenContent: RewrittenNewsContent | null;
  /** 로딩 상태 */
  isLoading: boolean;
  /** 에러 메시지 */
  error?: string | null;
  /** 썸네일 이미지 URL */
  thumbnailUrl?: string | null;
  /** 뉴스 요약/설명 (원본) - 무료 사용자에게 표시 */
  description?: string | null;
}

// ============================================
// 스켈레톤 컴포넌트
// ============================================

function ContentSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      {/* 요약 스켈레톤 */}
      <div className="space-y-2">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/6" />
      </div>

      {/* 본문 스켈레톤 */}
      <div className="space-y-2 pt-4">
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full" />
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full" />
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full" />
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
      </div>

      {/* 투자 포인트 스켈레톤 */}
      <div className="pt-4 space-y-2">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32" />
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-48" />
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-40" />
      </div>
    </div>
  );
}

// ============================================
// 투자 심리 배지 컴포넌트
// ============================================

function SentimentBadge({ sentiment }: { sentiment: NewsSentiment }) {
  const config = SENTIMENT_CONFIG[sentiment];

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-medium ${config.bgColor} ${config.color}`}>
      <span>{config.icon}</span>
      <span>{config.label}</span>
    </span>
  );
}

// ============================================
// 메인 컴포넌트
// ============================================

export function NewsContent({
  title,
  source,
  publishedAt,
  originalUrl,
  rewrittenContent,
  isLoading,
  error,
  thumbnailUrl,
  description,
}: NewsContentProps) {
  // 사용자 폰트 크기 설정
  const { titleSize, bodySize } = useFontSizeStore();

  return (
    <div className="flex flex-col h-full">
      {/* ========================================
          썸네일 이미지
          ======================================== */}
      {thumbnailUrl && (
        <div className="relative aspect-video w-full overflow-hidden bg-gray-100 dark:bg-gray-900 rounded-lg mb-4">
          <img
            src={thumbnailUrl}
            alt={title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* ========================================
          헤더: 제목, 출처, 시간
          ======================================== */}
      <div className="mb-4">
        {/* 메타 정보 */}
        <div className="flex items-center gap-2 mb-2 text-sm text-gray-500 dark:text-gray-400">
          <span>{source}</span>
          <span>·</span>
          <span>{publishedAt}</span>
        </div>

        {/* 제목 */}
        <h1 className={`${FONT_SIZE_MAP.article.title[titleSize]} font-bold text-gray-900 dark:text-white leading-tight`}>
          {title}
        </h1>
      </div>

      {/* ========================================
          콘텐츠 영역
          ======================================== */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          // 로딩 상태
          <div className="py-4">
            <div className="flex items-center gap-2 mb-4 text-sm text-blue-600 dark:text-blue-400">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>AI가 뉴스를 분석하고 있습니다...</span>
            </div>
            <ContentSkeleton />
          </div>
        ) : error ? (
          // 에러 상태
          <div className="py-8 text-center">
            <p className="text-red-500 dark:text-red-400 mb-4">{error}</p>
            <a
              href={originalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <span>원문에서 보기</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        ) : rewrittenContent ? (
          // ========================================
          // AI 재작성 콘텐츠 (프리미엄 사용자)
          // ========================================
          <div className="space-y-6">
            {/* 투자 심리 배지 */}
            <div className="flex items-center gap-3">
              <SentimentBadge sentiment={rewrittenContent.sentiment} />
              <span className="text-xs text-gray-500 dark:text-gray-400">
                AI 분석 결과
              </span>
            </div>

            {/* 핵심 요약 */}
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
              <h2 className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-2 flex items-center gap-2">
                <span>✨</span>
                <span>핵심 요약</span>
              </h2>
              <p className={`${FONT_SIZE_MAP.article.body[bodySize]} text-gray-700 dark:text-gray-300 leading-relaxed`}>
                {rewrittenContent.summary}
              </p>
            </div>

            {/* 재작성된 본문 */}
            <div>
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <span>📰</span>
                <span>AI 재작성</span>
              </h2>
              <p className={`${FONT_SIZE_MAP.article.body[bodySize]} text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line`}>
                {rewrittenContent.content}
              </p>
            </div>

            {/* 투자 포인트 */}
            {rewrittenContent.investmentPoints.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <span>💡</span>
                  <span>투자 포인트</span>
                </h2>
                <ul className="space-y-2">
                  {rewrittenContent.investmentPoints.map((point, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400"
                    >
                      <span className="text-blue-500 mt-0.5">•</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 관련 종목 */}
            {rewrittenContent.relatedStocks.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <span>📊</span>
                  <span>관련 종목</span>
                </h2>
                <div className="flex flex-wrap gap-2">
                  {rewrittenContent.relatedStocks.map((stock, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full text-sm"
                    >
                      {stock}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : description ? (
          // ========================================
          // 기본 뉴스 정보 (무료 사용자 또는 AI 재작성 전)
          // ========================================
          <div className="space-y-6">
            {/* 요약문 표시 */}
            <div>
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <span>📰</span>
                <span>뉴스 요약</span>
              </h2>
              <p className={`${FONT_SIZE_MAP.article.body[bodySize]} text-gray-700 dark:text-gray-300 leading-relaxed`}>
                {description}
              </p>
            </div>

            {/* 원문 보기 유도 메시지 */}
            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                전체 내용은 원문에서 확인하세요.
              </p>
              <a
                href={originalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                <span>원문 보기</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </div>
        ) : null}
      </div>

      {/* ========================================
          푸터: 원문 보기 링크
          ======================================== */}
      <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
        <a
          href={originalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
        >
          <span>원문 보기</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
        <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
          이 콘텐츠는 AI가 원문을 기반으로 재작성한 것입니다.
        </p>
      </div>
    </div>
  );
}

export default NewsContent;
