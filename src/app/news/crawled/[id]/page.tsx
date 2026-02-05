'use client';

/**
 * 크롤링 뉴스 상세 페이지 (모바일용)
 *
 * 모바일에서 크롤링된 뉴스 클릭 시 이동하는 전체 화면 페이지입니다.
 *
 * ============================================================
 * 라우트: /news/crawled/[id]
 * ============================================================
 * - id: 뉴스 고유 ID (URL 인코딩됨)
 *
 * ============================================================
 * 요금제별 동작:
 * ============================================================
 * - 프리미엄 사용자: AI 재작성 콘텐츠 표시
 * - 무료 사용자: 뉴스 기본 정보 + 원문 링크 표시 (AI 재작성 X)
 *
 * ============================================================
 * 기능:
 * ============================================================
 * - 뉴스 ID로 API에서 원본 정보 조회
 * - 프리미엄 사용자만 AI 재작성 API 호출
 * - NewsContent 공통 컴포넌트로 렌더링
 * - 뒤로가기 버튼 (router.back())
 */

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { BottomNav } from '@/components/layout/BottomNav';
import { NewsContent } from '@/components/news';
import { useAuth } from '@/components/providers/AuthProvider';
import { RewrittenNewsContent, RewriteNewsResponse } from '@/types/rewritten-news';
import { CrawledNewsItem, CrawledNewsResponse } from '@/types/crawled-news';

// ============================================
// 페이지 컴포넌트
// ============================================

export default function CrawledNewsDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  // 프리미엄 사용자 여부 확인
  const { isPremium } = useAuth();

  // 디코딩된 뉴스 ID
  const newsId = decodeURIComponent(id);

  // 뉴스 원본 정보 상태
  const [newsInfo, setNewsInfo] = useState<{
    title: string;
    source: string;
    publishedAt: string;
    url: string;
    thumbnail: string | null;
    description: string | null;
  } | null>(null);

  // AI 재작성 콘텐츠 상태 (프리미엄 사용자만 사용)
  const [rewrittenContent, setRewrittenContent] = useState<RewrittenNewsContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ========================================
  // 뉴스 정보 및 AI 재작성 로드
  // ========================================
  /**
   * 뉴스 정보를 로드하고 프리미엄 사용자에게만 AI 재작성을 제공합니다.
   *
   * [무료 사용자]
   * - 뉴스 기본 정보만 로드
   * - AI 재작성 API 호출하지 않음
   * - 원문 링크 제공
   *
   * [프리미엄 사용자]
   * - 뉴스 기본 정보 로드
   * - AI 재작성 API 호출
   * - AI 분석 결과 표시
   */
  useEffect(() => {
    const loadNews = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // 1. 뉴스 목록에서 해당 뉴스 찾기
        // (캐시된 뉴스 데이터에서 검색)
        // TODO: 실제로는 뉴스 ID로 직접 조회하는 API가 필요할 수 있음
        // 현재는 모든 카테고리를 검색하여 해당 ID를 찾음
        const categories = ['headlines', 'market', 'disclosure', 'world', 'bond'];
        let foundNews: CrawledNewsItem | null = null;

        for (const category of categories) {
          const res = await fetch(`/api/news?category=${category}&limit=50`);
          const data: CrawledNewsResponse = await res.json();

          if (data.success && data.news) {
            const news = data.news.find((n) => n.id === newsId);
            if (news) {
              foundNews = news;
              break;
            }
          }
        }

        if (!foundNews) {
          setError('뉴스를 찾을 수 없습니다.');
          setIsLoading(false);
          return;
        }

        // 뉴스 정보 설정
        setNewsInfo({
          title: foundNews.title,
          source: foundNews.source,
          publishedAt: foundNews.publishedAt,
          url: foundNews.url,
          thumbnail: foundNews.thumbnail,
          description: foundNews.description,
        });

        // ========================================
        // 프리미엄 사용자만 AI 재작성 API 호출
        // ========================================
        // 무료 사용자는 기본 뉴스 정보만 표시하고 원문 링크 제공
        if (!isPremium) {
          setIsLoading(false);
          return;
        }

        // 2. AI 재작성 API 호출 (프리미엄 사용자만)
        const rewriteRes = await fetch('/api/news/rewrite', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            newsId: foundNews.id,
            url: foundNews.url,
            title: foundNews.title,
            source: foundNews.source,
            content: foundNews.description || undefined,
          }),
        });

        const rewriteData: RewriteNewsResponse = await rewriteRes.json();

        if (rewriteData.success && rewriteData.data) {
          setRewrittenContent({
            summary: rewriteData.data.summary,
            content: rewriteData.data.content,
            investmentPoints: rewriteData.data.investmentPoints,
            relatedStocks: rewriteData.data.relatedStocks,
            sentiment: rewriteData.data.sentiment,
          });
        } else {
          setError(rewriteData.error || 'AI 재작성에 실패했습니다.');
        }
      } catch (err) {
        console.error('[CrawledNewsDetailPage] 에러:', err);
        setError('뉴스를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    loadNews();
  }, [newsId, isPremium]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* 사이드바 - 데스크톱에서만 표시 */}
      <Sidebar activeMenu="news" />

      {/* 하단 네비게이션 - 모바일에서만 표시 */}
      <BottomNav activeMenu="news" />

      {/* 메인 콘텐츠 */}
      <main className="md:ml-[72px] lg:ml-60 pb-20 md:pb-8">
        <div className="max-w-3xl mx-auto px-4 py-6">
          {/* 뒤로 가기 버튼 */}
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-6 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm font-medium">뒤로 가기</span>
          </button>

          {/* 뉴스 카드 */}
          <article className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden p-6">
            {newsInfo ? (
              <NewsContent
                title={newsInfo.title}
                source={newsInfo.source}
                publishedAt={newsInfo.publishedAt}
                originalUrl={newsInfo.url}
                rewrittenContent={rewrittenContent}
                isLoading={isLoading}
                error={error}
                thumbnailUrl={newsInfo.thumbnail}
                description={newsInfo.description}
              />
            ) : isLoading ? (
              // 초기 로딩 상태
              <div className="py-12 text-center">
                <div className="flex items-center justify-center gap-2 text-blue-600 dark:text-blue-400">
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>뉴스를 불러오는 중...</span>
                </div>
              </div>
            ) : error ? (
              // 에러 상태
              <div className="py-12 text-center">
                <p className="text-red-500 dark:text-red-400 mb-4">{error}</p>
                <button
                  onClick={() => router.back()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  돌아가기
                </button>
              </div>
            ) : null}
          </article>
        </div>
      </main>
    </div>
  );
}
