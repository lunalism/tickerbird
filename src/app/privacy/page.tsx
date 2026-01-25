'use client';

/**
 * 개인정보처리방침 페이지
 *
 * Firestore siteContent 컬렉션에서 콘텐츠를 불러와 표시합니다.
 * HTML 형식의 콘텐츠를 렌더링합니다.
 */

import { useState } from 'react';
import Link from 'next/link';
import { Sidebar, BottomNav } from '@/components/layout';
import { MobileSearchHeader, GlobalSearch } from '@/components/features/search';
import { useSiteContent } from '@/hooks/useSiteContent';

export default function PrivacyPage() {
  const [activeMenu, setActiveMenu] = useState('privacy');
  const { content, isLoading, error } = useSiteContent('privacy');

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 사이드바 - 데스크톱 */}
      <div className="hidden lg:block">
        <Sidebar activeMenu={activeMenu} onMenuChange={setActiveMenu} />
      </div>

      {/* 메인 콘텐츠 */}
      <main className="flex-1 lg:ml-64">
        {/* 모바일 헤더 */}
        <div className="lg:hidden">
          <MobileSearchHeader />
        </div>

        {/* 데스크톱 헤더 */}
        <header className="hidden lg:block sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800">
          <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              개인정보처리방침
            </h1>
            <GlobalSearch />
          </div>
        </header>

        {/* 콘텐츠 영역 */}
        <div className="max-w-4xl mx-auto px-4 lg:px-6 py-6 pb-24 lg:pb-8">
          {/* 뒤로가기 */}
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mb-6 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
            </svg>
            홈으로
          </Link>

          {/* 로딩 상태 */}
          {isLoading && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="space-y-4 animate-pulse">
                <div className="w-64 h-8 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="w-full h-4 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="w-full h-4 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="w-3/4 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="w-full h-4 bg-gray-200 dark:bg-gray-700 rounded mt-6" />
                <div className="w-full h-4 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="w-5/6 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
              </div>
            </div>
          )}

          {/* 에러 상태 */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-6 border border-red-200 dark:border-red-800">
              <p className="text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* 콘텐츠 - HTML 렌더링 */}
          {!isLoading && !error && content && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 lg:p-8 shadow-sm border border-gray-100 dark:border-gray-700">
              <article className="prose prose-gray dark:prose-invert max-w-none prose-headings:scroll-mt-20">
                <div dangerouslySetInnerHTML={{ __html: content.content }} />
              </article>

              {/* 마지막 수정일 */}
              {content.updatedAt && (
                <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    마지막 수정:{' '}
                    {content.updatedAt.toDate().toLocaleDateString('ko-KR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* 하단 네비게이션 - 모바일 */}
      <div className="lg:hidden">
        <BottomNav activeMenu={activeMenu} onMenuChange={setActiveMenu} />
      </div>
    </div>
  );
}
